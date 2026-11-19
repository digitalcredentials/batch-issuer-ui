import { useState } from 'react'
import type { BatchIssuerAdapter } from './adapter'
import type { Batch } from './lib/types'
import BatchListPage from './components/BatchListPage'
import BatchEditor from './components/BatchEditor'

type View = { page: 'list' } | { page: 'edit'; batch: Batch }

// The batch screens: the list of batches, and the editor for one. The app
// supplies the session, the spaces API and the service calls via the adapter
// and renders this under its page header.
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
