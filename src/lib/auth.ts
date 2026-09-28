// Session storage, namespaced to this app. Same shape as the wallet's: the
// space URL the login API returned, and the exported key pair that
// authenticated, kept for signing WAS requests during the session.

const SPACE_KEY = 'batch_issuer_space_url'
const SESSION_KEY_KEY = 'batch_issuer_session_key'

export function getSessionKey(): object | null {
  const stored = localStorage.getItem(SESSION_KEY_KEY)
  return stored ? (JSON.parse(stored) as object) : null
}

export function setSessionKey(exportedKeyPair: object): void {
  localStorage.setItem(SESSION_KEY_KEY, JSON.stringify(exportedKeyPair))
}

export function getSpaceUrl(): string | null {
  return localStorage.getItem(SPACE_KEY)
}

export function setSpaceUrl(spaceUrl: string): void {
  localStorage.setItem(SPACE_KEY, spaceUrl)
}

export function clearSession(): void {
  localStorage.removeItem(SPACE_KEY)
  localStorage.removeItem(SESSION_KEY_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getSpaceUrl() && getSessionKey())
}
