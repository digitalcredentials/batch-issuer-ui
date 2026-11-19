// Deletes every space the key of an email and passphrase controls: the
// issuer's own space and any batch space a failed run left behind, so a test
// run leaves no bucket on the PWS server. Run by the browser suite after its
// tests, as a process of its own: Playwright's module loader cannot load
// pws-client's dependency graph (a CommonJS module in it require()s an ES
// module), and tsx can.
//
//   ISSUER_EMAIL=... ISSUER_PASSPHRASE=... PWS_BASE_URL=... npx tsx tests/helpers/delete-spaces.ts
//
// First: @interop/jsonld (CommonJS, in pws-client's graph) require()s this
// ES module mid-load, which fails unless it is already evaluated.
import '@interop/http-client'
import { PwsClient } from '@interop/pws-client'
import { deriveKeyPair } from '../../src/lib/identity.ts'

const { ISSUER_EMAIL, ISSUER_PASSPHRASE, PWS_BASE_URL } = process.env
if (!ISSUER_EMAIL || !ISSUER_PASSPHRASE || !PWS_BASE_URL) {
  console.error('Set ISSUER_EMAIL, ISSUER_PASSPHRASE and PWS_BASE_URL.')
  process.exit(2)
}

const keyPair = await deriveKeyPair(ISSUER_EMAIL, ISSUER_PASSPHRASE)
const client = PwsClient.fromSigner({ baseServerUrl: PWS_BASE_URL, signer: keyPair.signer() })
const { items } = await client.listSpaces()
for (const { id } of items) {
  await client.space(id).delete()
}
console.log(`deleted ${items.length} space(s) of ${ISSUER_EMAIL}`)
