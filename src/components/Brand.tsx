// The app's name as a heading: the Digital Credentials Commons mark
// (public/dcc-commons-mark.png, copied from badge-assets) beside the
// organisation and product names.
export default function Brand({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${centered ? 'justify-center text-left' : ''}`}>
      <img src="./dcc-commons-mark.png" alt="" className="h-10 w-10 shrink-0" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-tight text-slate-600">
          Digital Credentials Commons
        </span>
        <h1 className="text-lg font-bold leading-tight text-slate-900">Batch Credential Issuer</h1>
      </span>
    </div>
  )
}
