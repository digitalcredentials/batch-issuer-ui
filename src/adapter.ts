import type { WasClient } from '@interop/was-client'

// A WAS space as the wallet's spaces API reports it.
export interface SpaceInfo {
  url: string
  type: string
  name?: string
  createdAt?: string
}

// Everything the panel needs from its host (the wallet). The panel has no
// knowledge of localStorage, env vars, or the login flow — the host supplies
// the authenticated WAS client and the spaces API, and hears back when a call
// comes back unauthorized.
export interface BatchIssuerAdapter {
  // The wallet's session WAS client; null when the session is gone.
  getSession(): Promise<{ client: WasClient } | null>
  // The wallet back end's /spaces API.
  spaces: {
    // Creates a new WAS space of the given type; resolves to its space URL.
    create(type: 'batch', name: string): Promise<string>
    list(): Promise<SpaceInfo[]>
    remove(spaceUrl: string): Promise<void>
  }
  // Base URL of the credential-templates API (GET {base}/templates).
  templatesApiBase: string
  // Called when a WAS or spaces call is rejected as unauthorized.
  onUnauthorized(): void
}
