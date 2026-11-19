import type { PwsClient } from '@interop/pws-client'
import { deriveKeyPair, normalizeEmail } from './identity'
import {
  ISSUER_SPACE_TYPE,
  clientFor,
  createSpace,
  listSpaces,
  readProfile,
  sessionClient,
  writeProfile,
  type IssuerProfile,
} from './pws'
import { getSession, setSession, type IssuerSession } from './session'

// An email and passphrase always derive some key, so the key alone cannot
// say whether the passphrase was typed correctly. What does is the issuer's
// own space: creating an issuer key creates it, and signing in requires it.
// A mistyped passphrase derives a key that controls no such space.
export class NoIssuerKeyError extends Error {
  constructor() {
    super('No issuer key matches that email and passphrase.')
    this.name = 'NoIssuerKeyError'
  }
}

async function findIssuerSpace(client: PwsClient): Promise<string | null> {
  const spaces = await listSpaces(client)
  return spaces.find(({ types }) => types.includes(ISSUER_SPACE_TYPE))?.url ?? null
}

// Signs in with a key that exists. Throws NoIssuerKeyError when the derived
// key controls no issuer space.
export async function signIn(email: string, passphrase: string): Promise<IssuerSession> {
  const keyPair = await deriveKeyPair(email, passphrase)
  const client = clientFor(keyPair)
  const issuerSpaceUrl = await findIssuerSpace(client)
  if (!issuerSpaceUrl) {
    throw new NoIssuerKeyError()
  }
  const profile = await readProfile(client, issuerSpaceUrl)
  const session: IssuerSession = {
    email: normalizeEmail(email),
    did: client.controllerDid,
    exportedKeyPair: await keyPair.export({ secretKey: true, includeContext: true }),
    issuerSpaceUrl,
    registrationCode: profile?.registrationCode ?? '',
  }
  setSession(session)
  return session
}

// Creates the issuer key's space, which redeems the registration code, and
// signs in. An email and passphrase that already have a key are signed in as
// they are: there is one key per email and passphrase, so there is nothing
// to create. A code the server refuses fails with its coupon-required 403
// (registrationCodeRefused in errors.ts).
export async function createIssuerKey(
  email: string,
  passphrase: string,
  registrationCode: string
): Promise<IssuerSession> {
  const keyPair = await deriveKeyPair(email, passphrase)
  const client = clientFor(keyPair)
  let issuerSpaceUrl = await findIssuerSpace(client)
  let profile = issuerSpaceUrl ? await readProfile(client, issuerSpaceUrl) : null
  if (!issuerSpaceUrl) {
    issuerSpaceUrl = await createSpace(client, {
      type: ISSUER_SPACE_TYPE,
      name: 'Batch issuer',
      registrationCode,
    })
  }
  // Also reached by a second attempt after the space was created and the
  // profile write failed
  if (!profile?.registrationCode) {
    const now = new Date().toISOString()
    profile = {
      email: normalizeEmail(email),
      registrationCode,
      createdAt: profile?.createdAt ?? now,
      updatedAt: now,
    }
    await writeProfile(client, issuerSpaceUrl, profile)
  }
  const session: IssuerSession = {
    email: normalizeEmail(email),
    did: client.controllerDid,
    exportedKeyPair: await keyPair.export({ secretKey: true, includeContext: true }),
    issuerSpaceUrl,
    registrationCode: profile.registrationCode,
  }
  setSession(session)
  return session
}

// Replaces the registration code the signed-in issuer's spaces are created
// with, in the profile and in the session.
export async function saveRegistrationCode(registrationCode: string): Promise<IssuerSession> {
  const session = getSession()
  const client = await sessionClient()
  if (!session || !client) {
    throw new Error('Not signed in.')
  }
  const now = new Date().toISOString()
  const current = await readProfile(client, session.issuerSpaceUrl)
  const profile: IssuerProfile = {
    email: session.email,
    createdAt: current?.createdAt ?? now,
    registrationCode,
    updatedAt: now,
  }
  await writeProfile(client, session.issuerSpaceUrl, profile)
  const updated = { ...session, registrationCode }
  setSession(updated)
  return updated
}
