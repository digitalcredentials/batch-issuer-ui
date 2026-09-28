import type { Batch } from './types.ts'
import { getSessionWASClient } from './was.ts'

// Batches live in the owner's WAS space, one JSON resource per batch in the
// `batches` collection.
const COLLECTION_ID = 'batches'

async function getCollection() {
  const session = await getSessionWASClient()
  if (!session) {
    throw new Error('Not logged in.')
  }
  return session.client.space(session.spaceId).collection(COLLECTION_ID)
}

function resourceId(batchId: string): string {
  return `${batchId}.json`
}

export async function saveBatch(batch: Batch): Promise<Batch> {
  const collection = await getCollection()
  const stored: Batch = { ...batch, updatedAt: new Date().toISOString() }
  const data = JSON.parse(JSON.stringify(stored))
  try {
    await collection.put(resourceId(batch.id), data)
  } catch {
    // First save into a space that requires explicit collection creation.
    const session = await getSessionWASClient()
    await session!.client.space(session!.spaceId).createCollection({
      id: COLLECTION_ID,
      name: 'Credential batches',
    })
    await collection.put(resourceId(batch.id), data)
  }
  return stored
}

export async function loadBatch(batchId: string): Promise<Batch | null> {
  const collection = await getCollection()
  const data = await collection.get(resourceId(batchId))
  return data && !(data instanceof Blob) ? (data as unknown as Batch) : null
}

export async function deleteBatch(batchId: string): Promise<void> {
  const session = await getSessionWASClient()
  if (!session) {
    throw new Error('Not logged in.')
  }
  await session.client
    .space(session.spaceId)
    .collection(COLLECTION_ID)
    .resource(resourceId(batchId))
    .delete()
}

// Loads every batch in the collection. Batches are small (metadata plus CSV
// rows), so fetching each listed resource is fine at this scale.
export async function listBatches(): Promise<Batch[]> {
  const collection = await getCollection()
  const listing = await collection.list().catch(() => null)
  if (!listing) {
    return []
  }
  const ids = (listing.items ?? [])
    .map((item) => item.id ?? item.url?.split('/').pop() ?? '')
    .filter((id) => id.endsWith('.json'))
  const batches = await Promise.all(
    ids.map(async (id) => {
      const data = await collection.get(id).catch(() => null)
      return data && !(data instanceof Blob) ? (data as unknown as Batch) : null
    })
  )
  return batches
    .filter((batch): batch is Batch => batch !== null && typeof batch.id === 'string')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
