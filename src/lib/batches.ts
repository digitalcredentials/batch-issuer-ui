import type { BatchIssuerAdapter } from '../adapter'
import type { Batch } from './types'

// Every batch lives in its own WAS space, registered with type 'batch'. The
// batch document itself is one JSON resource inside that space.
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
// on the first save.
export async function saveBatch(adapter: BatchIssuerAdapter, batch: Batch): Promise<Batch> {
  const client = await getClient(adapter)
  const spaceUrl = batch.spaceUrl || (await adapter.spaces.create('batch', batch.name))
  const stored: Batch = { ...batch, spaceUrl, updatedAt: new Date().toISOString() }
  const data = JSON.parse(JSON.stringify(stored))
  const collection = batchCollection(client, spaceUrl)
  try {
    await collection.put(RESOURCE_ID, data)
  } catch {
    // First write into a server that wants the collection configured first.
    await collection.configure({ name: 'Batch' })
    await collection.put(RESOURCE_ID, data)
  }
  return stored
}

export async function loadBatch(adapter: BatchIssuerAdapter, spaceUrl: string): Promise<Batch | null> {
  const client = await getClient(adapter)
  const data = await batchCollection(client, spaceUrl).get(RESOURCE_ID)
  return data && !(data instanceof Blob) ? (data as unknown as Batch) : null
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
