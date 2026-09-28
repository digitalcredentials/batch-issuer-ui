import type { TemplateInfo } from './types.ts'

// The credential-templates API: GET {base}/templates lists the available
// templates with the field declarations used to map CSV columns.
export async function fetchTemplates(): Promise<TemplateInfo[]> {
  const base = (import.meta.env.VITE_TEMPLATES_API_BASE ?? '').replace(/\/+$/, '')
  const response = await fetch(`${base}/templates`)
  if (!response.ok) {
    throw new Error(`Failed to load templates: ${response.status}`)
  }
  const { templates } = (await response.json()) as { templates: TemplateInfo[] }
  return templates
}
