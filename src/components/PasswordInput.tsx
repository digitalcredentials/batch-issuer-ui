import { useState } from 'react'

// A passphrase field with a Show/Hide button. The page keeps its own <label>
// for the input. The button is named by its visible text alone, so the field
// stays the only thing its label names.
export default function PasswordInput({
  id,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  autoComplete: 'new-password' | 'current-password'
  value: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 py-2 pl-3 pr-16 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <button
        type="button"
        aria-controls={id}
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 right-0 rounded-r-md px-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
