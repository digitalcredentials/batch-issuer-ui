import type { PwsClient } from '@interop/pws-client'
import type { BatchIssuerAdapter, NotifyResult, SpaceInfo } from '../adapter'
import type { Batch } from './types'
import { config } from './config'
import { BATCH_SPACE_TYPE, createSpace, deleteSpace, listSpaces, sessionClient } from './pws'
import { getSession } from './session'

// The status list service's POST /revoke. The revocation token is the
// authorization, so the request is not signed.
async function revokeStatus(revocationToken: string): Promise<void> {
  const response = await fetch(`${config.statusApiBase}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revocationToken }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'The revocation failed.')
  }
}

// What the batch screens need from the signed-in issuer: the PWS client, the
// batch spaces, and the two service calls. `onUnauthorized` is called when
// the session turns out to be gone.
export function createIssuerAdapter(onUnauthorized: () => void): BatchIssuerAdapter {
  async function requireClient(): Promise<PwsClient> {
    const client = await sessionClient()
    if (!client) {
      onUnauthorized()
      throw new Error('UNAUTHORIZED')
    }
    return client
  }

  // batch-issuer-backend's POST /notify: a zcap invocation of the request
  // URL signed with the issuer's key, the key that controls the batch's
  // space.
  async function notifyRecipients(batch: Batch): Promise<NotifyResult> {
    const client = await requireClient()
    const response = await client.request({
      url: `${config.batchApiBase}/notify`,
      method: 'POST',
      json: { batch },
    })
    return response.data as NotifyResult
  }

  return {
    getSession: async () => {
      const client = await sessionClient()
      return client ? { client } : null
    },
    spaces: {
      create: async (_type, name) =>
        createSpace(await requireClient(), {
          type: BATCH_SPACE_TYPE,
          name,
          registrationCode: getSession()?.registrationCode ?? '',
        }),
      list: async () =>
        (await listSpaces(await requireClient())).map(
          ({ url, types, name, createdAt }): SpaceInfo => ({
            url,
            type: types.includes(BATCH_SPACE_TYPE) ? 'batch' : 'issuer',
            ...(name !== undefined && { name }),
            ...(createdAt !== undefined && { createdAt }),
          })
        ),
      remove: async (spaceUrl) => deleteSpace(await requireClient(), spaceUrl),
    },
    notifyRecipients,
    revokeStatus,
    templatesApiBase: config.templatesApiBase,
    onUnauthorized,
  }
}
