import { useState } from 'react'
import type { BatchIssuerAdapter } from './adapter'
import type { Batch } from './lib/types'
import BatchListPage from './components/BatchListPage'
import BatchEditor from './components/BatchEditor'

type View = { page: 'list' } | { page: 'edit'; batch: Batch }

// The batch issuer panel: create and edit batches of credentials to issue.
// The host (the wallet) supplies session, spaces API, and templates API via
// the adapter and mounts this inside its own chrome.
export default function BatchIssuerPanel({ adapter }: { adapter: BatchIssuerAdapter }) {
  const [view, setView] = useState<View>({ page: 'list' })

  return view.page === 'list' ? (
    <BatchListPage adapter={adapter} onEdit={(batch) => setView({ page: 'edit', batch })} />
  ) : (
    <BatchEditor
      adapter={adapter}
      initialBatch={view.batch}
      onDone={() => setView({ page: 'list' })}
    />
  )
}
