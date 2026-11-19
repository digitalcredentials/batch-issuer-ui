import { useMemo, useState } from 'react'
import BatchIssuerPanel from './BatchIssuerPanel'
import AppShell from './components/AppShell'
import SignInPage from './pages/SignInPage'
import { createIssuerAdapter } from './lib/issuerAdapter'
import { clearSession, getSession, type IssuerSession } from './lib/session'

// The whole app: the sign-in page until an issuer key is open in this tab,
// then the batch screens under the page header.
export default function App() {
  const [session, setSession] = useState<IssuerSession | null>(getSession)

  const adapter = useMemo(
    () =>
      createIssuerAdapter(() => {
        clearSession()
        setSession(null)
      }),
    []
  )

  if (!session) {
    return <SignInPage onSignedIn={setSession} />
  }
  return (
    <AppShell
      session={session}
      onSignOut={() => {
        clearSession()
        setSession(null)
      }}
    >
      {/* Keyed by the key, so another issuer signing in starts from the list */}
      <BatchIssuerPanel key={session.did} adapter={adapter} />
    </AppShell>
  )
}
