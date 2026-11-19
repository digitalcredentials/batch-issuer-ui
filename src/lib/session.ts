// The signed-in issuer, kept in sessionStorage, so the signing key is
// discarded when the tab closes. Opening the app again asks for the email
// and passphrase.
const SESSION_KEY = 'batch_issuer_session'

export interface IssuerSession {
  email: string
  // The did:key of the signing key
  did: string
  // The exported Ed25519 key pair; Ed25519VerificationKey.from reads it back
  exportedKeyPair: object
  // The issuer's own space, which holds its profile
  issuerSpaceUrl: string
  // The code the PWS server redeems when a space is created; '' when the
  // profile holds none
  registrationCode: string
}

export function getSession(): IssuerSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (!stored) {
    return null
  }
  try {
    return JSON.parse(stored) as IssuerSession
  } catch {
    return null
  }
}

export function setSession(session: IssuerSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
