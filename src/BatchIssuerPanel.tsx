import { useEffect, useState } from 'react'
import type { BatchIssuerAdapter } from './adapter'
import type { Batch } from './lib/types'
import { loadBatch } from './lib/batches'
import BatchListPage from './components/BatchListPage'
import BatchEditor from './components/BatchEditor'

type View = { page: 'loading' } | { page: 'list' } | { page: 'edit'; batch: Batch }

// The batch issuer panel: create and edit batches of credentials to issue.
// The host (the wallet) supplies session, spaces API, and templates API via
// the adapter and mounts this inside its own chrome. When the host passes
// initialSpaceUrl (e.g. the user chose a batch space in the spaces view), the
// panel opens straight into that space's batch; a batch that cannot be loaded
// falls back to the list.
export default function BatchIssuerPanel({
  adapter,
  initialSpaceUrl,
}: {
  adapter: BatchIssuerAdapter
  initialSpaceUrl?: string
}) {
  const [view, setView] = useState<View>(initialSpaceUrl ? { page: 'loading' } : { page: 'list' })

  useEffect(() => {
    if (!initialSpaceUrl) {
      return
    }
    let cancelled = false
    loadBatch(adapter, initialSpaceUrl)
      .then((batch) => {
        if (!cancelled) {
          // The space it came from is authoritative, as in listBatches
          setView(batch ? { page: 'edit', batch: { ...batch, spaceUrl: initialSpaceUrl } } : { page: 'list' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setView({ page: 'list' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [adapter, initialSpaceUrl])

  return view.page === 'loading' ? (
    <p className="text-sm text-slate-500">Loading batch…</p>
  ) : view.page === 'list' ? (
    <BatchListPage adapter={adapter} onEdit={(batch) => setView({ page: 'edit', batch })} />
  ) : (
    <BatchEditor
      adapter={adapter}
      initialBatch={view.batch}
      onDone={() => setView({ page: 'list' })}
    />
  )
}
