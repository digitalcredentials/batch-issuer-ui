# batch-issuer-ui

The batch credential issuer: a web app for issuing a batch of verifiable
credentials, for example a conference organizer issuing an attendance
credential to every attendee. The sandbox serves it at
[https://batch.lcw-sandbox.org](https://batch.lcw-sandbox.org). React + Vite.

It is an app of its own. It has its own sign-in and shares no account, code
or session with the Learner Credential Wallet; recipients collect what it
issues into a wallet, and that is the only connection. Everything it stores
is in [Portable Web Spaces](https://github.com/digitalcredentials/was-server-aws)
(PWS) on the storage server, under a key the issuer derives in the browser.
What runs on the server side (emailing recipients, issuing at collection
time) is [batch-issuer-backend](https://github.com/digitalcredentials/batch-issuer-backend).

## What it does

- **Create and edit batches** with: batch name, batch description, credential
  image URL, issuer name, issuer URL (optional), issuer logo URL (optional,
  previewed), and a **template** picked from the
  [credential-templates](https://github.com/digitalcredentials/credential-templates)
  API (`GET /templates`).
- **Upload a CSV** of recipients. The first row is the header; the file is
  parsed into JSON and shown as an editable grid: edit any cell, delete rows,
  insert rows anywhere, or append new ones. Required template columns missing
  from the CSV are flagged.
- **Notify recipients**: once a batch is saved and has recipient rows,
  **Notify recipients** (after a confirmation) posts the batch to the back
  end's `POST /notify`. The back end stages a KMS-encrypted bundle per
  recipient in the batch's space, records progress in the space's `logs`
  collection (no recipient data), and emails each recipient a collection link.
  Per-row failures (a missing `recipientEmail`, an oversize row) are reported
  without stopping the rest of the batch. A notified batch can no longer be
  edited; **Resend** on a log row emails that one recipient a fresh link.
- **Revoke a credential**: the batch's activity log shows each credential's
  progress (emailed, collected) and, once collected, a **Revoke** button. The
  revocation token recorded in the log at collection time is the bearer
  capability spent against the status list service's `POST /revoke`;
  `revokedAt` is written back to the log and the credential stops being
  collectable. A recipient who was re-notified and collected more than once
  holds several credentials, each with its own status position: the collapsed
  log row summarizes them ("1 of 2 revoked", "Revoke… (2 copies)") and the
  expanded row carries one **Revoke this copy** button per collected copy.

## Signing in

There are no issuer accounts on any server. An issuer's identity is one
Ed25519 key, derived in the browser from the email and passphrase
(`src/lib/identity.ts`):

- PBKDF2-HMAC-SHA256, 600,000 iterations, 32 bytes of output, which are the
  Ed25519 seed;
- the passphrase is NFKC-normalized and otherwise taken as typed;
- the salt is `lcw-batch-issuer/key/v1:` followed by the email, trimmed and
  lowercased.

The key's `did:key` controls the issuer's spaces on the PWS server and signs
every request, so the same email and passphrase open the same batches from
any browser. Neither is sent anywhere, the email is not verified, and nobody
can reset the passphrase: a forgotten passphrase leaves that key's batches
unreachable. The derivation must not change, for the same reason: a different
salt, iteration count or normalization gives every issuer a different key.
`npm test` checks it against an independent computation.

An email and passphrase always derive some key, so the key alone cannot say
whether the passphrase was typed correctly. The **issuer space** does
(`src/lib/issuer.ts`):

- **Create an issuer key** (the first time) takes the email, a passphrase of
  at least 12 characters, and a **registration code**. It creates the issuer
  space, a space typed `["Space", "IssuerSpace"]`, with the registration code
  as the coupon the PWS server requires (`POST /spaces/`), and writes the
  profile to `profile/issuer.json` in it: the email and when it was made.
- **Sign in** derives the key and lists its spaces. A key that controls no
  issuer space is refused ("No issuer key matches that email and
  passphrase"), which is what a mistyped passphrase gets.

The registration code is used in that one request and kept nowhere: not in
the profile, not in the browser. A space the server creates for a
registration code is an account to it, and the account's further spaces are
created under it with a capability on that space and no code. So each batch
space is a `POST /space/{issuer space}/spaces`, signed by the issuer's key,
which controls the issuer space. A code that later runs out or expires
changes nothing for an issuer who already has a key.

The signed-in key is kept in `sessionStorage` (`src/lib/session.ts`), so it
is discarded when the tab closes.

## What is stored where

| Space | Type | Holds |
| --- | --- | --- |
| The issuer space, one per key | `["Space", "IssuerSpace"]` | `profile/issuer.json`: the email, timestamps. To the PWS server this space is the issuer's account |
| A batch space, one per batch | `["Space", "BatchSpace"]` | `batch/batch.json`: the batch document, recipients included. `logs/log.json`: the activity log, written by the back end. `{credId}/bundle.json`: one KMS-encrypted bundle per staged credential, written by the back end |

The first save of a batch creates its space under the issuer space
(`POST /space/{issuer space}/spaces`), creates its `batch` collection and
writes the document;
deleting a batch deletes its whole space (registry row and bucket). The batch
list is the key's `BatchSpace` spaces. Both collections are plaintext: the
back end reads and writes a batch space's bucket directly, so the server
stores these documents readable, and only the issuer's key may read them
through the server.

The back end authorizes `POST /notify` by the same key: the request is a zCap
invocation signed by the issuer's `did:key`, and the batch space named in it
must be a `BatchSpace` that `did:key` controls.

## Configuration

`import.meta.env` is read in one place, `src/lib/config.ts`. `.env.production`
(committed; public URLs only) is used by `npm run build`; local development
reads `.env`, which `.env.example` documents.

| Variable | What it is |
| --- | --- |
| `VITE_PWS_BASE_URL` | The PWS server; its Spaces Repository is `{base}/spaces/` |
| `VITE_BATCH_API_BASE` | batch-issuer-backend's HTTP API (its `BatchApi` stack output); `POST {base}/notify` |
| `VITE_TEMPLATES_API_BASE` | The credential-templates API; `GET {base}/templates` |
| `VITE_STATUS_API_BASE` | The Bitstring Status List service; `POST {base}/revoke` |

## Running it locally

```bash
npm install
cp .env.example .env
npm run dev -- --port 5175
```

`.env.example` points at the deployed sandbox services, so a local run reads
and writes real spaces on the sandbox PWS server. To run the back end's
notify endpoint locally as well, start it with `sam local start-api` in
batch-issuer-backend and set `VITE_BATCH_API_BASE` to its address (for
example `http://localhost:3013`).

## Tests

```bash
npm test
```

The key derivation, checked against an independent PBKDF2 and Ed25519
computation with `node:crypto`.

```bash
REGISTRATION_CODE=... npm run test:e2e
REGISTRATION_CODE=... BASE_URL=https://batch.lcw-sandbox.org npm run test:e2e
```

The app end to end in a browser (Playwright), against the local dev server
or, with `BASE_URL`, a deployed site, and in both cases against the real
services that build names. It creates an issuer key under a fresh email: a
registration code the server does not accept is refused, a mistyped
passphrase is refused, the browser does not keep the code, a batch is
saved into a space of its own created under the issuer space, the code
went to the server in one request and no other, its one recipient is
notified, the activity
log shows the notification, the session is still there after a reload, the
batch is deleted, and signing out discards the session. It needs a
registration code the PWS server accepts, and it deletes the spaces it
created when it ends (`tests/helpers/delete-spaces.ts`, run with `tsx` as a
process of its own). Notify really sends: the one recipient is Amazon SES's
mailbox simulator (`NOTIFY_RECIPIENT` to change it), which accepts the
message and delivers it to nobody. The pointer row notify writes to the back
end's bundles table stays, as it does for any deleted batch.

CI (`.github/workflows/ci.yml`) runs the lint, the build and `npm test` on
every pull request. It does not run the browser suite, which needs a
registration code and sends an email.

## Deploying

The sandbox serves the app at `batch.lcw-sandbox.org` from a private S3
bucket behind CloudFront ([`infra/template.yaml`](infra/template.yaml): the
bucket, the distribution with AWS's security-headers policy, the certificate
validated through the zone, and the alias records).

Once, for the hosting (in us-east-1, where CloudFront keeps its certificates):

```bash
aws cloudformation deploy --stack-name batch-issuer-app --template-file infra/template.yaml \
  --parameter-overrides DomainName=batch.lcw-sandbox.org HostedZoneId=Z04250862QG6MQUAE24XV
```

Then for every release, with the bucket and distribution the stack outputs:

```bash
npm run build
aws s3 sync dist/ s3://<BucketName>/ --delete
# The shell names the current hashed assets, so it must never be cached
aws s3 cp s3://<BucketName>/index.html s3://<BucketName>/index.html --metadata-directive REPLACE \
  --cache-control "no-store, must-revalidate" --content-type text/html
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

batch-issuer-backend must be deployed at a version whose notify endpoint
verifies the issuer's `did:key` (its README says how).

## Code

- `src/App.tsx`: the sign-in page until an issuer key is open in this tab,
  then the batch screens under the page header.
- `src/pages/SignInPage.tsx`, `src/components/AppShell.tsx`: the sign-in
  (and the one place the registration code is entered) and the header.
- `src/lib/identity.ts`, `issuer.ts`, `session.ts`, `pws.ts`: the key, the
  sign-in and key creation, the session, and the PWS calls.
- `src/BatchIssuerPanel.tsx`, `src/components/BatchListPage.tsx`,
  `BatchEditor.tsx`, `RowGrid.tsx`, `src/lib/batches.ts`: the batch screens.
  They reach the session, the spaces and the two service calls only through
  the `BatchIssuerAdapter` (`src/adapter.ts`), which `src/lib/issuerAdapter.ts`
  builds from the signed-in key.
- `src/lib/errors.ts`: every failed request translated into a sentence
  saying what failed and what the person can do.
