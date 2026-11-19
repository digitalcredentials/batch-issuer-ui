import { useState, type FormEvent } from 'react'
import Brand from '../components/Brand'
import PasswordInput from '../components/PasswordInput'
import { registrationCodeRefused } from '../lib/errors'
import { MIN_PASSPHRASE_LENGTH } from '../lib/identity'
import { NoIssuerKeyError, createIssuerKey, signIn } from '../lib/issuer'
import type { IssuerSession } from '../lib/session'

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'
const labelClass = 'mb-1 block text-sm font-medium text-slate-700'

type Mode = 'sign-in' | 'create'

// Signing in, and creating an issuer key the first time. Both derive the same
// key from the email and passphrase in this browser; creating also makes the
// issuer's own space with the registration code, the one time the code is
// used, and signing in requires that space, which is how a mistyped
// passphrase is told from a new issuer.
export default function SignInPage({ onSignedIn }: { onSignedIn: (session: IssuerSession) => void }) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [registrationCode, setRegistrationCode] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  function switchTo(next: Mode) {
    setMode(next)
    setError('')
    setConfirmation('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !passphrase) {
      setError('Enter your email and passphrase.')
      return
    }
    if (mode === 'create') {
      if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        setError(`Choose a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`)
        return
      }
      if (passphrase !== confirmation) {
        setError('The two passphrases are not the same.')
        return
      }
      if (!registrationCode.trim()) {
        setError('Enter the registration code you were given.')
        return
      }
    }
    setWorking(true)
    try {
      onSignedIn(
        mode === 'create'
          ? await createIssuerKey(email, passphrase, registrationCode.trim())
          : await signIn(email, passphrase)
      )
    } catch (err) {
      console.error(`Batch issuer: ${mode} failed`, err)
      if (err instanceof NoIssuerKeyError) {
        setError(
          'No issuer key matches that email and passphrase. Check both for typing mistakes. If this is your first time here, create an issuer key.'
        )
      } else if (mode === 'create' && registrationCodeRefused(err)) {
        setError(
          'That registration code was not accepted. Check it, or ask whoever runs this deployment for a current one.'
        )
      } else {
        setError(
          mode === 'create'
            ? 'The issuer key could not be created. Please try again.'
            : 'Signing in did not work: the storage server could not be reached. Please try again.'
        )
      }
      setWorking(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-6">
          <Brand centered />
        </header>
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="mb-1 text-xl font-semibold">
            {mode === 'create' ? 'Create an issuer key' : 'Sign in'}
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            {mode === 'create'
              ? 'Your issuer key is made in this browser from your email and passphrase. Neither is sent anywhere, and nobody can reset them: if you forget the passphrase, your batches cannot be opened again.'
              : 'Issue a batch of credentials from a CSV, and email each recipient a link to collect theirs.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="passphrase" className={labelClass}>
                Passphrase
              </label>
              <PasswordInput
                id="passphrase"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                value={passphrase}
                onChange={setPassphrase}
              />
              {mode === 'create' && (
                <p className="mt-1 text-xs text-slate-500">At least {MIN_PASSPHRASE_LENGTH} characters.</p>
              )}
            </div>

            {mode === 'create' && (
              <>
                <div>
                  <label htmlFor="confirmation" className={labelClass}>
                    Passphrase again
                  </label>
                  <PasswordInput
                    id="confirmation"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={setConfirmation}
                  />
                </div>
                <div>
                  <label htmlFor="registration-code" className={labelClass}>
                    Registration code
                  </label>
                  <input
                    id="registration-code"
                    autoComplete="off"
                    required
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The code you were given for this deployment. It is used once, now, to create your
                    issuer key&#39;s storage. It is not kept, and you will not be asked for it again.
                  </p>
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={working}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {mode === 'create'
                ? working
                  ? 'Creating your key…'
                  : 'Create issuer key'
                : working
                  ? 'Signing in…'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === 'create' ? 'Already have an issuer key? ' : 'First time here? '}
            <button
              type="button"
              onClick={() => switchTo(mode === 'create' ? 'sign-in' : 'create')}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              {mode === 'create' ? 'Sign in' : 'Create an issuer key'}
            </button>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Your signing key is kept for this browser tab only, and is discarded when the tab closes.
        </p>
      </div>
    </div>
  )
}
