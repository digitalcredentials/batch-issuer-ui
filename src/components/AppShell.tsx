import type { ReactNode } from 'react'
import type { IssuerSession } from '../lib/session'
import Brand from './Brand'

// The signed-in page: the header (who is signed in, signing out) above the
// batch screens.
export default function AppShell({
  session,
  onSignOut,
  children,
}: {
  session: IssuerSession
  onSignOut: () => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Brand />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              Signed in as{' '}
              <span className="break-all font-medium text-slate-800" title={session.did}>
                {session.email}
              </span>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
