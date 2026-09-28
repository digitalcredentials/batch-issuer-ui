export interface BatchIssuerDetails {
  name: string
  url?: string
  logo?: string
}

// One batch of credentials-to-be: the metadata entered in the form plus the
// recipient rows parsed from (and edited after) the CSV upload. Every batch
// lives in its own WAS space (registered with type 'batch'), stored as the
// JSON resource batch/batch.json.
export interface Batch {
  id: string
  // The batch's own space URL; empty until the first save creates the space.
  spaceUrl: string
  name: string
  description: string
  issuer: BatchIssuerDetails
  templateId: string
  columns: string[]
  rows: Record<string, string>[]
  createdAt: string
  updatedAt: string
}

export interface TemplateField {
  name: string
  label: string
  required: boolean
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  fields: TemplateField[]
}

export function newBatch(): Batch {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    spaceUrl: '',
    name: '',
    description: '',
    issuer: { name: '' },
    templateId: '',
    columns: [],
    rows: [],
    createdAt: now,
    updatedAt: now,
  }
}
