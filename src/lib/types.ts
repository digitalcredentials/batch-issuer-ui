export interface BatchIssuerDetails {
  name: string
  url?: string
  // The issuer's logo URL; `issuer.image` on the credential.
  image?: string
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
  // The credential's image URL (the Open Badges achievement image).
  image?: string
  // The id of the achievement every credential in the batch awards, minted
  // once per batch so the credentials share it.
  achievementId: string
  templateId: string
  columns: string[]
  // One row per recipient, keyed by the CSV columns. `credId` is a reserved
  // key, written onto the row when its notification is staged: the row's
  // staging history as a comma-joined list, newest last (a resend appends a
  // fresh credId). It ties the row to its credentials directly (surviving
  // reordering or hand-edits of this document), is never shown in the grid
  // (which renders `columns` only), is stripped from the template fields at
  // issuance, and stays out of the activity log, which carries credIds
  // alone.
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
    achievementId: `urn:uuid:${crypto.randomUUID()}`,
    templateId: '',
    columns: [],
    rows: [],
    createdAt: now,
    updatedAt: now,
  }
}
