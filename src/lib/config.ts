// The deployed services this app talks to, from the build's environment
// (.env in local development, .env.production for `npm run build`). Every
// other module reads them from here.
const trimSlash = (url: string | undefined) => (url ?? '').replace(/\/+$/, '')

export const config = {
  // The PWS server that holds the issuer's spaces
  pwsBase: trimSlash(import.meta.env.VITE_PWS_BASE_URL),
  // batch-issuer-backend's HTTP API (POST /notify)
  batchApiBase: trimSlash(import.meta.env.VITE_BATCH_API_BASE),
  // The credential-templates API (GET /templates)
  templatesApiBase: trimSlash(import.meta.env.VITE_TEMPLATES_API_BASE),
  // The Bitstring Status List service (POST /revoke)
  statusApiBase: trimSlash(import.meta.env.VITE_STATUS_API_BASE),
}
