# batch-issuer-ui

A React panel for the Learner Credential Wallet that lets a wallet owner issue
a batch of verifiable credentials — for example, a conference organizer issuing
an attendance credential to every attendee. It ships as a component library
(`@digitalcredentials/batch-issuer-ui`) that
[lcw-front-end](../lcw-front-end) mounts as a screen, reusing the wallet's own
session: the wallet supplies its authenticated `WasClient`, the WAS server's
`/spaces` API, and the issuance and revocation calls through an adapter, so
this package knows nothing about login, localStorage, or env vars.

## What it does

- **Create and edit batches** with: batch name, batch description, issuer name,
  issuer URL (optional), issuer logo URL (optional, previewed), and a
  **template** picked from the [credential-templates](../credential-templates)
  API (`GET /templates`).
- **Upload a CSV** of recipients. The first row is the header; the file is
  parsed into JSON and shown as an editable grid: edit any cell, delete rows,
  insert rows anywhere, or append new ones. Required template columns missing
  from the CSV are flagged.
- **One WAS space per batch**: the first save creates a brand-new space
  (controlled by the wallet's DID) through the WAS server's `POST /spaces`,
  registered with `type: 'batch'` in the spaces registry, and writes the batch
  document to `batch/batch.json` in that space. The batch list is the
  registry's batch-type spaces; deleting a batch deletes its whole space
  (registry row + bucket).
- **Per-credential revocation**: the batch's activity log shows each
  credential's progress (emailed, collected) and, once collected, a **Revoke**
  button — the revocation token recorded in the log at collection time is the
  bearer capability the adapter's `revokeStatus` spends against the status
  list service; `revokedAt` is written back to the log and the credential
  stops being collectable. A recipient who was re-notified (Resend) and
  collected more than once holds several credentials, each with its own
  status position: the collapsed log row summarizes them ("1 of 2 revoked",
  "Revoke… (2 copies)") and the expanded row carries one **Revoke this copy**
  button per collected copy.

## Usage

```tsx
import { BatchIssuerPanel, type BatchIssuerAdapter } from '@digitalcredentials/batch-issuer-ui'

const adapter: BatchIssuerAdapter = {
  getSession,          // () => Promise<{ client: WasClient } | null>
  spaces: { create, list, remove },  // the WAS server's /spaces API
  notifyRecipients,    // the issuer back end's POST /notify
  revokeStatus,        // the status list service's POST /revoke (by token)
  templatesApiBase,    // credential-templates API base URL
  onUnauthorized,      // e.g. clear the session and bounce to /login
}

// Optional: initialSpaceUrl opens straight into that space's batch (the
// wallet passes it when a batch space is opened from the spaces view).
<BatchIssuerPanel adapter={adapter} initialSpaceUrl={spaceUrl} />
```

Styling is Tailwind utility classes compiled by the consumer. In a Tailwind v4
app, add to the main stylesheet:

```css
@source "../node_modules/@digitalcredentials/batch-issuer-ui/dist";
```

## Develop

```bash
npm install
npm run build       # vite lib build + d.ts to dist/
npm run typecheck
```

`react`, `react-dom`, and `@interop/was-client` are peer dependencies.

## Publish

The package is published to npm as `@digitalcredentials/batch-issuer-ui`
(public access). `prepublishOnly` runs the typecheck and the build, so the
published tarball always contains a fresh `dist/`.

```bash
npm version patch   # or minor / major; commits and tags
npm publish
git push --follow-tags
```

The wallet depends on the published version (`^x.y.z` in lcw-front-end's
package.json), so a panel change reaches the wallet by publishing, then
bumping the wallet's dependency. For local work on both at once, point the
wallet at this checkout with `npm link` (or a `file:../batch-issuer-ui`
dependency) and run `npm run build` here before building the wallet.

## Notify recipients

Once a batch is saved and has recipient rows, **Notify recipients** (after a
confirmation) posts the batch to the issuer back end's `POST /notify` via
`adapter.notifyRecipients(batch)`. The back end stages a KMS-encrypted bundle
per recipient in the batch's space (`<cred_id>/bundle.json`), records progress
in a special `logs` collection (`logs/log.json`, no PII), and emails each
recipient a collection link carrying their `credId` and decryption context.
Per-row failures (missing `recipientEmail`, oversize rows) are reported back
without stopping the rest of the batch.
