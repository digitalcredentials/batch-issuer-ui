import type { BatchIssuerAdapter } from '../adapter'
import type { Batch } from './types'

// Every batch lives in its own WAS space (a Space whose type array carries
// "BatchSpace"; the wallet reports it as type 'batch'). The batch document
// itself is one JSON resource inside that space.
const COLLECTION_ID = 'batch'
const RESOURCE_ID = 'batch.json'

// Splits a space URL into the WAS server base URL and the space id.
export function parseSpaceUrl(spaceUrl: string): { serverUrl: string; spaceId: string } | null {
  const match = spaceUrl.match(/^(.+)\/space\/([^/?#]+)$/)
  return match ? { serverUrl: match[1], spaceId: match[2] } : null
}

async function getClient(adapter: BatchIssuerAdapter) {
  const session = await adapter.getSession()
  if (!session) {
    adapter.onUnauthorized()
    throw new Error('Not logged in.')
  }
  return session.client
}

function batchCollection(
  client: Awaited<ReturnType<typeof getClient>>,
  spaceUrl: string
) {
  const parsed = parseSpaceUrl(spaceUrl)
  if (!parsed) {
    throw new Error(`Not a space URL: ${spaceUrl}`)
  }
  return client.space(parsed.spaceId).collection(COLLECTION_ID)
}

// Saves the batch into its own space, creating (and registering) that space
// and its batch collection on the first save. The collection is plaintext by
// design: the issuer lambdas read and write batch collections server-side.
export async function saveBatch(adapter: BatchIssuerAdapter, batch: Batch): Promise<Batch> {
  const client = await getClient(adapter)
  let spaceUrl = batch.spaceUrl
  if (!spaceUrl) {
    spaceUrl = await adapter.spaces.create('batch', batch.name)
    const parsed = parseSpaceUrl(spaceUrl)
    if (!parsed) {
      throw new Error(`Not a space URL: ${spaceUrl}`)
    }
    await client.space(parsed.spaceId).createCollection({ id: COLLECTION_ID, name: 'Batch' })
  }
  const stored: Batch = { ...batch, spaceUrl, updatedAt: new Date().toISOString() }
  const data = JSON.parse(JSON.stringify(stored))
  await batchCollection(client, spaceUrl).put(RESOURCE_ID, data)
  return stored
}

export async function loadBatch(adapter: BatchIssuerAdapter, spaceUrl: string): Promise<Batch | null> {
  const client = await getClient(adapter)
  const data = await batchCollection(client, spaceUrl).get(RESOURCE_ID)
  return data && !(data instanceof Blob) ? (data as unknown as Batch) : null
}

// The activity log the notify/collection back end keeps in the batch space
// (logs/log.json): notification runs, and per-credential email/collection
// timestamps keyed by credId — no recipient data.
export interface BatchLogCredential {
  emailSentAt?: string
  collectedAt?: string
  collections?: string[]
  // The bearer token that revokes this credential's status position, stored
  // here (the batch owner's space) when the position was allocated at
  // notification time.
  revocationToken?: string
  statusListCredential?: string
  statusListIndex?: string
  revokedAt?: string
}

export interface BatchLog {
  entries: { type: string; at: string; recipientCount?: number }[]
  credentials: Record<string, BatchLogCredential>
}

export async function loadBatchLog(
  adapter: BatchIssuerAdapter,
  spaceUrl: string
): Promise<BatchLog | null> {
  const client = await getClient(adapter)
  const parsed = parseSpaceUrl(spaceUrl)
  if (!parsed) {
    return null
  }
  const data = await client
    .space(parsed.spaceId)
    .collection('logs')
    .get('log.json')
    .catch(() => null)
  if (!data || data instanceof Blob) {
    return null
  }
  const log = data as unknown as Partial<BatchLog>
  return { entries: log.entries ?? [], credentials: log.credentials ?? {} }
}

// True when the log records at least one notification run.
export function recipientsNotified(log: BatchLog | null): boolean {
  return !!log?.entries.some(({ type }) => type === 'notification-triggered')
}

// Revokes one credential: the status list service is told first (the token is
// the authorization), then the batch log records revokedAt so the UI shows it
// and does not offer the revocation again.
export async function revokeCredential(
  adapter: BatchIssuerAdapter,
  spaceUrl: string,
  credId: string,
  token: string
): Promise<void> {
  await adapter.revokeStatus(token)
  const client = await getClient(adapter)
  const parsed = parseSpaceUrl(spaceUrl)
  if (!parsed) {
    throw new Error(`Not a space URL: ${spaceUrl}`)
  }
  const logs = client.space(parsed.spaceId).collection('logs')
  const data = await logs.get('log.json').catch(() => null)
  const log = (data && !(data instanceof Blob) ? data : { entries: [], credentials: {} }) as BatchLog
  log.credentials ??= {}
  log.credentials[credId] = {
    ...log.credentials[credId],
    revokedAt: new Date().toISOString(),
  }
  await logs.put('log.json', JSON.parse(JSON.stringify(log)) as Parameters<typeof logs.put>[1])
}

// Deleting a batch deletes its whole space: the back end removes the registry
// row and the space's bucket.
export async function deleteBatch(adapter: BatchIssuerAdapter, batch: Batch): Promise<void> {
  if (!batch.spaceUrl) {
    return
  }
  await adapter.spaces.remove(batch.spaceUrl)
}

// Loads every batch: the registered batch-type spaces, each holding one batch
// document. A batch space whose document is missing or unreadable (a save
// that never completed) still shows up as a stub so it can be deleted.
export async function listBatches(adapter: BatchIssuerAdapter): Promise<Batch[]> {
  const client = await getClient(adapter)
  const spaces = (await adapter.spaces.list()).filter(({ type }) => type === 'batch')
  const batches = await Promise.all(
    spaces.map(async (space): Promise<Batch> => {
      try {
        const data = await batchCollection(client, space.url).get(RESOURCE_ID)
        if (data && !(data instanceof Blob)) {
          return { ...(data as unknown as Batch), spaceUrl: space.url }
        }
      } catch {
        // fall through to the stub
      }
      return {
        id: space.url,
        spaceUrl: space.url,
        name: space.name ?? '',
        description: '',
        issuer: { name: '' },
        templateId: '',
        columns: [],
        rows: [],
        createdAt: space.createdAt ?? '',
        updatedAt: space.createdAt ?? '',
      }
    })
  )
  return batches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
