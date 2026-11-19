import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'

// An issuer's identity here is one Ed25519 key, derived in the browser from
// the email and passphrase and from nothing else: there is no account on any
// server. Its did:key controls the issuer's spaces on the PWS server and
// signs every request, so the same email and passphrase open the same
// batches from any browser, and nobody can reset them.
//
// The derivation is fixed. Changing the salt label, the iteration count or
// either normalization gives every issuer a different key, which leaves the
// batches made under the old one unreachable.
const SALT_LABEL = 'lcw-batch-issuer/key/v1:'
const ITERATIONS = 600_000

export const MIN_PASSPHRASE_LENGTH = 12

// One email, however it was typed.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// PBKDF2-HMAC-SHA256 over the passphrase (NFKC, so one passphrase is one byte
// string on every platform), salted with the normalized email so two issuers
// with the same passphrase hold different keys. The 32 bytes are the Ed25519
// seed.
export async function deriveKeyPair(email: string, passphrase: string): Promise<Ed25519VerificationKey> {
  const encoder = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const seed = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(SALT_LABEL + normalizeEmail(email)),
      iterations: ITERATIONS,
    },
    material,
    256
  )
  const keyPair = await Ed25519VerificationKey.generate({ seed: new Uint8Array(seed) })
  keyPair.controller = `did:key:${keyPair.fingerprint()}`
  keyPair.id = `${keyPair.controller}#${keyPair.fingerprint()}`
  return keyPair
}
