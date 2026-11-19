import { useEffect, useRef, useState, type FormEvent } from 'react'
import { saveRegistrationCode } from '../lib/issuer'
import type { IssuerSession } from '../lib/session'

// Shows and replaces the registration code the issuer's batch storage is
// created with. The code is kept in the issuer's own space, so every browser
// that signs in with the key reads it; a code that has run out or expired is
// replaced here.
export default function RegistrationCodeDialog({
  session,
  onSaved,
  onClose,
}: {
  session: IssuerSession
  onSaved: (session: IssuerSession) => void
  onClose: () => void
}) {
  const [code, setCode] = useState(session.registrationCode)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) {
      setError('Enter a registration code.')
      return
    }
    setSaving(true)
    setError('')
    try {
      onSaved(await saveRegistrationCode(code.trim()))
    } catch (err) {
      console.error('Batch issuer: saving the registration code failed', err)
      setError('The registration code could not be saved. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-code-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <h2 id="registration-code-title" className="mb-1 text-lg font-semibold">
          Registration code
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Each new batch gets its own storage, and the storage server creates it only for a
          registration code it accepts. If a batch cannot be saved because the code was not accepted,
          enter a current one here. It is checked the next time a batch is saved.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="current-registration-code" className="mb-1 block text-sm font-medium text-slate-700">
            Registration code
          </label>
          <input
            id="current-registration-code"
            ref={input}
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
