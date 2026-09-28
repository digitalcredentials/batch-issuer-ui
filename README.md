# batch-issuer-ui

A React panel for the Learner Credential Wallet that lets a wallet owner issue
a batch of verifiable credentials — for example, a conference organizer issuing
an attendance credential to every attendee. It ships as a component library
(`@digitalcredentials/batch-issuer-ui`) that
[lcw-front-end](../lcw-front-end) mounts as a screen, reusing the wallet's own
session: the wallet supplies its authenticated `WasClient` and its back end's
`/spaces` API through an adapter, so this package knows nothing about login,
localStorage, or env vars.

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
  (controlled by the wallet's DID) through the wallet back end's
  `POST /spaces`, registered with `type: 'batch'` in the spaces registry, and
  writes the batch document to `batch/batch.json` in that space. The batch
  list is the registry's batch-type spaces; deleting a batch deletes its whole
  space (registry row + bucket).

## Usage

```tsx
import { BatchIssuerPanel, type BatchIssuerAdapter } from '@digitalcredentials/batch-issuer-ui'

const adapter: BatchIssuerAdapter = {
  getSession,          // () => Promise<{ client: WasClient } | null>
  spaces: { create, list, remove },  // the wallet back end's /spaces API
  templatesApiBase,    // credential-templates API base URL
  onUnauthorized,      // e.g. clear the session and bounce to /login
}

<BatchIssuerPanel adapter={adapter} />
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
