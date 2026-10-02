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
  // One row per recipient, keyed by the CSV columns. `credId` is a reserved
  // key, written onto the row when its notification is staged: it ties the
  // row to its credential directly (surviving reordering or hand-edits of
  // this document), is never shown in the grid (which renders `columns`
  // only), is stripped from the template fields at issuance, and stays out
  // of the activity log, which carries credIds alone.
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
