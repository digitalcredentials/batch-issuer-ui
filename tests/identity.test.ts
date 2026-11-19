// The key derivation, checked against an independent computation with
// node:crypto, so a change to the salt label, the iteration count or either
// normalization fails here before it leaves every issuer with a different
// key.
//
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPrivateKey, createPublicKey, pbkdf2Sync } from 'node:crypto'
import { deriveKeyPair, normalizeEmail } from '../src/lib/identity.ts'

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58(bytes: Uint8Array): string {
  let value = BigInt(`0x${Buffer.from(bytes).toString('hex')}`)
  let out = ''
  while (value > 0n) {
    out = BASE58[Number(value % 58n)] + out
    value /= 58n
  }
  return out
}

// did:key of the Ed25519 key whose seed is PBKDF2-HMAC-SHA256(passphrase,
// 'lcw-batch-issuer/key/v1:' + email, 600000 iterations, 32 bytes).
function expectedDid(email: string, passphrase: string): string {
  const seed = pbkdf2Sync(passphrase, `lcw-batch-issuer/key/v1:${email}`, 600_000, 32, 'sha256')
  const privateKey = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8',
  })
  const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).subarray(-32)
  // multicodec ed25519-pub (0xed 0x01), multibase base58btc ('z')
  return `did:key:z${base58(Buffer.concat([Buffer.from([0xed, 0x01]), publicKey]))}`
}

test('the key is PBKDF2-SHA256 of the passphrase, salted with the email', async () => {
  const keyPair = await deriveKeyPair('issuer@example.org', 'correct horse battery staple')
  assert.equal(keyPair.controller, expectedDid('issuer@example.org', 'correct horse battery staple'))
  assert.equal(keyPair.id, `${keyPair.controller}#${keyPair.fingerprint()}`)
})

test('the email is trimmed and lowercased before it salts the key', async () => {
  assert.equal(normalizeEmail('  Issuer@Example.ORG '), 'issuer@example.org')
  const typed = await deriveKeyPair('  Issuer@Example.ORG ', 'correct horse battery staple')
  assert.equal(typed.controller, expectedDid('issuer@example.org', 'correct horse battery staple'))
})

test('the passphrase is NFKC-normalized, and otherwise taken as typed', async () => {
  // U+FB01 (the "fi" ligature) normalizes to "fi"
  const ligature = await deriveKeyPair('issuer@example.org', 'conﬁdential passphrase')
  assert.equal(ligature.controller, expectedDid('issuer@example.org', 'confidential passphrase'))
  const spaced = await deriveKeyPair('issuer@example.org', ' confidential passphrase')
  assert.notEqual(spaced.controller, ligature.controller)
})

test('another email or another passphrase is another key', async () => {
  const one = await deriveKeyPair('issuer@example.org', 'correct horse battery staple')
  const otherEmail = await deriveKeyPair('other@example.org', 'correct horse battery staple')
  const otherPassphrase = await deriveKeyPair('issuer@example.org', 'correct horse battery stapler')
  assert.notEqual(one.controller, otherEmail.controller)
  assert.notEqual(one.controller, otherPassphrase.controller)
})
