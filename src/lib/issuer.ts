import type { PwsClient } from '@interop/pws-client'
import { deriveKeyPair, normalizeEmail } from './identity'
import {
  ISSUER_SPACE_TYPE,
  clientFor,
  createIssuerSpace,
  listSpaces,
  readProfile,
  writeProfile,
} from './pws'
import { setSession, type IssuerSession } from './session'

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

async function open(
  email: string,
  keyPair: Awaited<ReturnType<typeof deriveKeyPair>>,
  client: PwsClient,
  issuerSpaceUrl: string
): Promise<IssuerSession> {
  const session: IssuerSession = {
    email: normalizeEmail(email),
    did: client.controllerDid,
    exportedKeyPair: await keyPair.export({ secretKey: true, includeContext: true }),
    issuerSpaceUrl,
  }
  setSession(session)
  return session
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
  return open(email, keyPair, client, issuerSpaceUrl)
}

// Creates the issuer key's space, which is what the registration code is
// for, and signs in. The code is sent to the server in that one request and
// kept nowhere: the batch spaces are created under the issuer's space, with
// the key alone. An email and passphrase that already have a key are signed
// in as they are: there is one key per email and passphrase, so there is
// nothing to create and the code is not sent. A code the server refuses
// fails with its coupon-required 403 (registrationCodeRefused in errors.ts).
export async function createIssuerKey(
  email: string,
  passphrase: string,
  registrationCode: string
): Promise<IssuerSession> {
  const keyPair = await deriveKeyPair(email, passphrase)
  const client = clientFor(keyPair)
  let issuerSpaceUrl = await findIssuerSpace(client)
  if (!issuerSpaceUrl) {
    issuerSpaceUrl = await createIssuerSpace(client, { name: 'Batch issuer', registrationCode })
  }
  // Also reached by a second attempt after the space was created and the
  // profile write failed
  if (!(await readProfile(client, issuerSpaceUrl))) {
    const now = new Date().toISOString()
    await writeProfile(client, issuerSpaceUrl, { email: normalizeEmail(email), createdAt: now, updatedAt: now })
  }
  return open(email, keyPair, client, issuerSpaceUrl)
}
