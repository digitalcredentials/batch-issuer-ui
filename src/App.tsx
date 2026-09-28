import { useState } from 'react'
import { clearSession, isAuthenticated } from './lib/auth.ts'
import type { Batch } from './lib/types.ts'
import LoginPage from './components/LoginPage.tsx'
import BatchListPage from './components/BatchListPage.tsx'
import BatchEditor from './components/BatchEditor.tsx'

type View = { page: 'list' } | { page: 'edit'; batch: Batch }

export default function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated())
  const [view, setView] = useState<View>({ page: 'list' })

  if (!authenticated) {
    return <LoginPage onLoggedIn={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">
            Batch Issuer
            <span className="ml-2 text-sm font-normal text-slate-500">
              issue credentials from your wallet
            </span>
          </h1>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={() => {
              clearSession()
              setAuthenticated(false)
              setView({ page: 'list' })
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {view.page === 'list' ? (
          <BatchListPage onEdit={(batch) => setView({ page: 'edit', batch })} />
        ) : (
          <BatchEditor
            initialBatch={view.batch}
            onDone={() => setView({ page: 'list' })}
          />
        )}
      </main>
    </div>
  )
}
