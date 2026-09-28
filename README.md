# batch-issuer-ui

A standalone web app that lets a wallet owner issue a batch of verifiable
credentials — for example, a conference organizer issuing an attendance
credential to every attendee. It plugs into the Learner Credential Wallet
ecosystem: sign in with the same wallet account (email + password, deriving the
same did:key), and batches are stored in the account's Wallet Attached Storage
space, in a `batches` collection.

## What it does

- **Create and edit batches** with: batch name, batch description, issuer name,
  issuer URL (optional), issuer logo URL (optional, previewed), and a
  **template** picked from the [credential-templates](../credential-templates)
  API (`GET /templates`).
- **Upload a CSV** of recipients. The first row is the header; the file is
  parsed into JSON and shown as an editable grid: edit any cell, delete rows,
  insert rows anywhere, or append new ones. Required template columns missing
  from the CSV are flagged.
- **Persist batches** to the owner's WAS space via `@interop/was-client`
  (`batches/{batch-id}.json`), so they follow the account across devices.

Populating and signing the credentials when holders collect them happens
elsewhere: the credential-templates API's `POST /templates/{id}` fills a
template per recipient.

## Configure

Copy `.env.example` to `.env`:

- `VITE_LOGIN_API_BASE` — the lcw-back-end base URL (`POST {base}/login`).
- `VITE_TEMPLATES_API_BASE` — the credential-templates API base URL.

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
```

The login flow mirrors lcw-front-end: SHA-256(password) seeds an Ed25519 key
pair, a zcap-signed `POST /login` verifies it against the DID registered for
the email, and the returned space URL plus the exported key pair are kept in
localStorage for signing WAS requests during the session.
