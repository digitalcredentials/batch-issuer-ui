import type { PwsClient } from '@interop/pws-client'
import type { Batch } from './lib/types'

// The outcome of a notify run: how many recipients were emailed, which rows
// failed (by index) with why, and which credId was staged for which row —
// returned for the batch document only, never written to the activity log,
// so the log stays free of recipient data.
export interface NotifyResult {
  sent: number
  failures: { row: number; reason: string }[]
  recipientRows?: Record<string, number>
}

// A space of the signed-in issuer's, as the batch screens need to know it.
// `type` is 'batch' for a batch space.
export interface SpaceInfo {
  url: string
  type: string
  name?: string
  createdAt?: string
}

// Everything the batch screens need from the app around them
// (lib/issuerAdapter.ts builds it from the signed-in issuer's key). The
// screens have no knowledge of sessionStorage, env vars, or the sign-in: they
// are handed the signed PWS client and the spaces API, and say so when they
// find the session gone.
export interface BatchIssuerAdapter {
  // The signed-in issuer's PWS client; null when the session is gone.
  getSession(): Promise<{ client: PwsClient } | null>
  // The PWS server's spaces, as the signed-in issuer.
  spaces: {
    // Creates a new space of the given type; resolves to its space URL.
    create(type: 'batch', name: string): Promise<string>
    list(): Promise<SpaceInfo[]>
    remove(spaceUrl: string): Promise<void>
  }
  // Emails every recipient in the batch a collection link, staging the
  // encrypted per-credential bundles (the issuer back end's POST /notify).
  notifyRecipients(batch: Batch): Promise<NotifyResult>
  // Revokes one credential's status position by its revocation token (the
  // status list service's POST /revoke; the token is the authorization).
  revokeStatus(revocationToken: string): Promise<void>
  // Base URL of the credential-templates API (GET {base}/templates).
  templatesApiBase: string
  // Called when a screen finds there is no session to act with.
  onUnauthorized(): void
}
