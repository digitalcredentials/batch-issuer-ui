import { PwsClient } from '@interop/pws-client'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { config } from './config'
import { getSession } from './session'

// Everything this app stores is in spaces on the PWS server, controlled by
// the issuer's did:key. There are two kinds, told apart by the type array the
// server keeps for each space: the issuer's own space, one per key, and one
// space per batch.
export const ISSUER_SPACE_TYPE = 'IssuerSpace'
export const BATCH_SPACE_TYPE = 'BatchSpace'

export interface SpaceEntry {
  id: string
  // Without the trailing slash of the canonical form: the batch document and
  // the notify service name a batch space this way.
  url: string
  types: string[]
  name?: string
  createdAt?: string
}

export function spaceUrlOf(spaceId: string): string {
  return `${config.pwsBase}/space/${spaceId}`
}

export function spaceIdOf(spaceUrl: string): string | null {
  return spaceUrl.match(/\/space\/([^/?#]+)\/?$/)?.[1] ?? null
}

export function clientFor(keyPair: Ed25519VerificationKey): PwsClient {
  return PwsClient.fromSigner({ baseServerUrl: config.pwsBase, signer: keyPair.signer() })
}

// One client per signed-in key, so the server's service description is
// discovered once per session rather than once per request.
let cached: { did: string; client: PwsClient } | null = null

// The signed-in issuer's client; null when nobody is signed in.
export async function sessionClient(): Promise<PwsClient | null> {
  const session = getSession()
  if (!session) {
    cached = null
    return null
  }
  if (cached?.did !== session.did) {
    const keyPair = await Ed25519VerificationKey.from(session.exportedKeyPair)
    cached = { did: session.did, client: clientFor(keyPair) }
  }
  return cached.client
}

// The spaces registered to the signing key. A key the server has never seen
// gets an empty list, not an error.
export async function listSpaces(client: PwsClient): Promise<SpaceEntry[]> {
  const { items } = await client.listSpaces()
  return items.map((item) => {
    const { createdAt } = item as { createdAt?: string }
    return {
      id: item.id,
      url: spaceUrlOf(item.id),
      types: item.type,
      ...(item.name !== undefined && { name: item.name }),
      ...(createdAt !== undefined && { createdAt }),
    }
  })
}

// Creates a space of the given kind under the signing key; resolves to its
// URL. This server creates a space only for a coupon it accepts (the
// registration code), which pws-client's createSpace() has no place for, so
// the request is made here. A code the server does not accept, an empty one
// included, is its coupon-required 403 (registrationCodeRefused in
// errors.ts).
export async function createSpace(
  client: PwsClient,
  { type, name, registrationCode }: { type: string; name: string; registrationCode: string }
): Promise<string> {
  const response = await client.request({
    url: `${config.pwsBase}/spaces/`,
    method: 'POST',
    json: { controller: client.controllerDid, name, type: ['Space', type], coupon: registrationCode },
  })
  return spaceUrlOf((response.data as { id: string }).id)
}

// Deletes a space: its registry row and its whole bucket.
export async function deleteSpace(client: PwsClient, spaceUrl: string): Promise<void> {
  const spaceId = spaceIdOf(spaceUrl)
  if (!spaceId) {
    throw new Error(`Not a space URL: ${spaceUrl}`)
  }
  await client.space(spaceId).delete()
}

// What the issuer's own space holds, at profile/issuer.json. The collection
// is plaintext, like a batch's: the server stores it readable, and only the
// issuer's key may read it through the server.
export interface IssuerProfile {
  email: string
  // The code the PWS server redeems when a space is created. Kept here so
  // the issuer enters it once, not in every browser.
  registrationCode: string
  createdAt: string
  updatedAt: string
}

const PROFILE_COLLECTION = 'profile'
const PROFILE_RESOURCE = 'issuer.json'

export async function readProfile(client: PwsClient, issuerSpaceUrl: string): Promise<IssuerProfile | null> {
  const spaceId = spaceIdOf(issuerSpaceUrl)
  if (!spaceId) {
    return null
  }
  const data = await client.space(spaceId).collection(PROFILE_COLLECTION).get(PROFILE_RESOURCE)
  return data && !(data instanceof Blob) ? (data as unknown as IssuerProfile) : null
}

export async function writeProfile(
  client: PwsClient,
  issuerSpaceUrl: string,
  profile: IssuerProfile
): Promise<void> {
  const spaceId = spaceIdOf(issuerSpaceUrl)
  if (!spaceId) {
    throw new Error(`Not a space URL: ${issuerSpaceUrl}`)
  }
  const space = client.space(spaceId)
  const existing = await space.collections()
  if (!existing?.items.some(({ id }) => id === PROFILE_COLLECTION)) {
    await space.createCollection({ id: PROFILE_COLLECTION, name: 'Profile' })
  }
  await space.collection(PROFILE_COLLECTION).put(PROFILE_RESOURCE, { ...profile })
}
