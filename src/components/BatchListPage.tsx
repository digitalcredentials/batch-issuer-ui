import { useEffect, useState } from 'react'
import type { BatchIssuerAdapter } from '../adapter'
import { listBatches } from '../lib/batches'
import { newBatch, type Batch } from '../lib/types'

export default function BatchListPage({
  adapter,
  onEdit,
}: {
  adapter: BatchIssuerAdapter
  onEdit: (batch: Batch) => void
}) {
  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listBatches(adapter).then(setBatches, (err) => {
      setError(err instanceof Error ? err.message : 'Failed to load batches.')
      setBatches([])
    })
  }, [adapter])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Credential batches</h2>
        <button
          type="button"
          onClick={() => onEdit(newBatch())}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New batch
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {batches === null ? (
        <p className="text-sm text-slate-500">Loading batches…</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-slate-500">
          No batches yet. Create one to issue credentials to a list of recipients. Each
          batch gets its own storage space.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {batches.map((batch) => (
            <li key={batch.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {batch.name || <span className="italic text-slate-400">Untitled batch</span>}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {batch.rows.length} recipient{batch.rows.length === 1 ? '' : 's'}
                  {batch.templateId && <> · template: {batch.templateId}</>}
                  {batch.issuer.name && <> · issuer: {batch.issuer.name}</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(batch)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
