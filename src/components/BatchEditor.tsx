import { useEffect, useMemo, useRef, useState } from 'react'
import type { BatchIssuerAdapter } from '../adapter'
import { saveBatch, deleteBatch, loadBatchLog, recipientsNotified, revokeCredential, type BatchLog } from '../lib/batches'
import { parseCsvFile } from '../lib/csv'
import { fetchTemplates } from '../lib/templates'
import type { Batch, TemplateInfo } from '../lib/types'
import RowGrid from './RowGrid'

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

export default function BatchEditor({
  adapter,
  initialBatch,
  onDone,
}: {
  adapter: BatchIssuerAdapter
  initialBatch: Batch
  onDone: () => void
}) {
  const [batch, setBatch] = useState<Batch>(initialBatch)
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [log, setLog] = useState<BatchLog | null>(null)
  // The credId currently being revoked, while its status call runs
  const [revoking, setRevoking] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Once recipients have been notified, the batch's details are frozen: the
  // staged bundles and emailed links were built from them.
  const notified = recipientsNotified(log)

  useEffect(() => {
    fetchTemplates(adapter.templatesApiBase).then(setTemplates, (err) => {
      setTemplates([])
      setError(err instanceof Error ? err.message : 'Failed to load templates.')
    })
  }, [adapter])

  async function refreshLog(spaceUrl: string) {
    try {
      setLog(await loadBatchLog(adapter, spaceUrl))
    } catch {
      // No log (or unreadable) just means no activity to show
    }
  }

  useEffect(() => {
    if (initialBatch.spaceUrl) {
      void refreshLog(initialBatch.spaceUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBatch.spaceUrl])

  // Revokes one credential's status position; the credential then fails
  // verifiers' status checks. Not reversible through this UI.
  async function handleRevoke(credId: string, token: string) {
    if (!confirm('Revoke this credential? Verifiers will see it as revoked. This cannot be undone here.')) {
      return
    }
    setRevoking(credId)
    setError(null)
    try {
      await revokeCredential(adapter, batch.spaceUrl, credId, token)
      await refreshLog(batch.spaceUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The revocation failed.')
    } finally {
      setRevoking(null)
    }
  }

  const selectedTemplate = useMemo(
    () => templates?.find(({ id }) => id === batch.templateId) ?? null,
    [templates, batch.templateId]
  )

  function update(changes: Partial<Batch>) {
    setBatch((current) => ({ ...current, ...changes }))
    setSavedAt(null)
  }

  function updateIssuer(changes: Partial<Batch['issuer']>) {
    setBatch((current) => ({ ...current, issuer: { ...current.issuer, ...changes } }))
    setSavedAt(null)
  }

  async function handleCsvUpload(file: File) {
    setError(null)
    try {
      const { columns, rows } = await parseCsvFile(file)
      if (
        batch.rows.length &&
        !confirm(`Replace the current ${batch.rows.length} row(s) with ${rows.length} row(s) from "${file.name}"?`)
      ) {
        return
      }
      update({ columns, rows })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleSave() {
    if (!batch.name.trim()) {
      setError('A batch needs a name before it can be saved.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // The first save creates and registers the batch's own WAS space.
      const stored = await saveBatch(adapter, batch)
      setBatch(stored)
      setSavedAt(stored.updatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save batch.')
    } finally {
      setSaving(false)
    }
  }

  async function handleNotify() {
    if (
      !confirm(
        "We're about to email all recipients in your batch to let them know they can now collect their credential. Okay to send the emails?"
      )
    ) {
      return
    }
    setNotifying(true)
    setError(null)
    setNotice(null)
    try {
      const { sent, failures, recipientRows } = await adapter.notifyRecipients(batch)
      setNotice(`Emailed ${sent} recipient${sent === 1 ? '' : 's'}.`)
      if (failures.length) {
        setError(
          `${failures.length} row${failures.length === 1 ? '' : 's'} failed: ` +
            failures.map(({ row, reason }) => `row ${row + 1} (${reason})`).join('; ')
        )
      }
      // Persist which credId belongs to which row in the batch document (it
      // already holds the rows), so the log view can show who each credential
      // was staged for; a resend merges its fresh credIds in.
      if (recipientRows && Object.keys(recipientRows).length) {
        const stored = await saveBatch(adapter, {
          ...batch,
          credentialRecipients: { ...batch.credentialRecipients, ...recipientRows },
        })
        setBatch(stored)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify recipients.')
    } finally {
      setNotifying(false)
      // The notify run appended to the batch's log; reload it so the form
      // locks and the button relabels
      if (batch.spaceUrl) {
        void refreshLog(batch.spaceUrl)
      }
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete batch "${batch.name || batch.id}"? This deletes the batch's whole storage space and cannot be undone.`
      )
    ) {
      return
    }
    setDeleting(true)
    setError(null)
    try {
      await deleteBatch(adapter, batch)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete batch.')
      setDeleting(false)
    }
  }

  // Columns declared by the template but absent from the uploaded CSV, so a
  // mismatch is visible before anyone tries to issue the batch.
  const missingColumns = useMemo(() => {
    if (!selectedTemplate || !batch.columns.length) return []
    return selectedTemplate.fields
      .filter(({ required, name }) => required && !batch.columns.includes(name))
      .map(({ name }) => name)
  }, [selectedTemplate, batch.columns])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {batch.name.trim() ? batch.name : 'New batch'}
        </h2>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-sm text-green-700">Saved</span>}
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Back to batches
          </button>
          {batch.spaceUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={handleNotify}
            disabled={notifying || !batch.spaceUrl || batch.rows.length === 0}
            title={
              !batch.spaceUrl
                ? 'Save the batch first'
                : batch.rows.length === 0
                  ? 'Upload recipients first'
                  : 'Email every recipient a collection link'
            }
            className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            {notifying ? 'Notifying…' : notified ? 'Resend Notifications' : 'Notify recipients'}
          </button>
          {!notified && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save batch'}
            </button>
          )}
        </div>
      </div>

      {notified && (
        <p className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
          The recipients have been notified and so the batch details can no longer be changed.
        </p>
      )}

      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</p>
      )}

      {batch.spaceUrl && (
        <p className="mb-4 text-xs text-slate-400">Batch space: {batch.spaceUrl}</p>
      )}

      <section className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Batch name</span>
          <input
            value={batch.name}
            onChange={(e) => update({ name: e.target.value })}
            disabled={notified}
            placeholder="VC Summit 2026 attendance"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Issuer name</span>
          <input
            value={batch.issuer.name}
            onChange={(e) => updateIssuer({ name: e.target.value })}
            disabled={notified}
            placeholder="Verifiable Credentials Summit"
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Batch description</span>
          <textarea
            value={batch.description}
            onChange={(e) => update({ description: e.target.value })}
            disabled={notified}
            rows={2}
            placeholder="Attendance credentials for everyone who attended the 2026 summit."
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Issuer URL <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            type="url"
            value={batch.issuer.url ?? ''}
            onChange={(e) => updateIssuer({ url: e.target.value || undefined })}
            disabled={notified}
            placeholder="https://summit.example.org"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Issuer logo URL <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={batch.issuer.logo ?? ''}
              onChange={(e) => updateIssuer({ logo: e.target.value || undefined })}
              disabled={notified}
              placeholder="https://summit.example.org/logo.png"
              className={inputClass}
            />
            {batch.issuer.logo && (
              <img
                src={batch.issuer.logo}
                alt="Issuer logo preview"
                className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-contain"
              />
            )}
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Template</span>
          <select
            value={batch.templateId}
            onChange={(e) => update({ templateId: e.target.value })}
            disabled={notified}
            className={inputClass}
          >
            <option value="">
              {templates === null ? 'Loading templates…' : 'Select a template…'}
            </option>
            {templates?.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <span className="mt-1 block text-xs text-slate-500">
              {selectedTemplate.description} Fields:{' '}
              {selectedTemplate.fields
                .map(({ name, required }) => (required ? `${name}*` : name))
                .join(', ')}
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">CSV</span>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            disabled={notified}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleCsvUpload(file)
            }}
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          <span className="mt-1 block text-xs text-slate-500">
            First row is the header; each column becomes a field, each row a recipient.
          </span>
        </label>
      </section>

      {missingColumns.length > 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          The CSV is missing columns the {selectedTemplate!.name} template requires:{' '}
          {missingColumns.join(', ')}
        </p>
      )}

      <section>
        <h3 className="mb-3 text-base font-semibold">
          Recipients{' '}
          <span className="text-sm font-normal text-slate-500">
            {batch.rows.length} row{batch.rows.length === 1 ? '' : 's'}
          </span>
        </h3>
        {batch.columns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Upload a CSV to load recipients. You can edit cells, delete rows, and insert
            new ones after the upload.
          </p>
        ) : (
          <RowGrid
            columns={batch.columns}
            rows={batch.rows}
            onChange={(rows) => update({ rows })}
            readOnly={notified}
          />
        )}
      </section>

      {log && (log.entries.length > 0 || Object.keys(log.credentials).length > 0) && (
        <section className="mt-8">
          <h3 className="mb-3 text-base font-semibold">Activity log</h3>
          {log.entries.length > 0 && (
            <ul className="mb-4 space-y-1">
              {log.entries.map(({ type, at, recipientCount }, index) => (
                <li key={`${at}-${index}`} className="text-sm text-slate-600">
                  {type === 'notification-triggered'
                    ? `Notifications sent to ${recipientCount ?? '?'} recipient${recipientCount === 1 ? '' : 's'}`
                    : type}{' '}
                  — {new Date(at).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
          {Object.keys(log.credentials).length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-medium text-slate-700">Recipient</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Emailed</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Collected</th>
                    <th className="px-3 py-2 font-medium text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(log.credentials).map(([credId, entry]) => {
                    const collections = entry.collections ?? (entry.collectedAt ? [entry.collectedAt] : [])
                    // Joined for display only: the log carries credIds, the
                    // batch document knows whose row each credId was staged
                    // for. Entries from before the mapping existed fall back
                    // to the credId.
                    const rowIndex = batch.credentialRecipients?.[credId]
                    const recipient = rowIndex === undefined ? undefined : batch.rows[rowIndex]
                    return (
                      <tr key={credId} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2" title={credId}>
                          {recipient ? (
                            <>
                              <span className="block text-slate-800">
                                {recipient.recipientName || '(no name)'}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {recipient.recipientEmail}
                              </span>
                            </>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">{credId}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {entry.emailSentAt ? new Date(entry.emailSentAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {collections.length === 0
                            ? 'Not collected'
                            : `${collections.length} time${collections.length === 1 ? '' : 's'}, last ${new Date(collections[collections.length - 1]).toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {entry.revokedAt ? (
                            <span className="text-red-600">
                              Revoked {new Date(entry.revokedAt).toLocaleDateString()}
                            </span>
                          ) : entry.revocationToken ? (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(credId, entry.revocationToken!)}
                              disabled={revoking !== null}
                              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {revoking === credId ? 'Revoking…' : 'Revoke'}
                            </button>
                          ) : (
                            // Issued before status positions existed
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
