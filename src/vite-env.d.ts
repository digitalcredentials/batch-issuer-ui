/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PWS_BASE_URL?: string
  readonly VITE_BATCH_API_BASE?: string
  readonly VITE_TEMPLATES_API_BASE?: string
  readonly VITE_STATUS_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
