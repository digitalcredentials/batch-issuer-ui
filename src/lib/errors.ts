// Server calls fail with whatever threw: the wallet's signed-request HTTP
// client, the WAS client (WasError), or a plain Error. None of those messages
// mean anything to the person running a batch, and some carry a URL and a
// status code. So every failed request is translated here, in the editor
// where it is shown, rather than in the wallet's adapter — every host then
// gets the same sentences.

// What the person was doing when the request failed; the sentence shown names
// the action.
export type RequestAction =
  | 'load-batches'
  | 'load-templates'
  | 'open-batch'
  | 'save'
  | 'notify'
  | 'resend'
  | 'revoke'
  | 'delete'

const FAILED: Record<RequestAction, string> = {
  'load-batches': 'The batches could not be loaded.',
  'load-templates': 'The templates could not be loaded.',
  'open-batch': 'The batch could not be opened.',
  save: 'The batch could not be saved.',
  notify: 'The recipients could not be notified.',
  resend: 'The notification could not be resent.',
  revoke: 'The credential could not be revoked.',
  delete: 'The batch could not be deleted.',
}

// The storage server's problem type for an account that holds no coupon to
// create a space with.
const COUPON_REQUIRED = 'https://github.com/digitalcredentials/was-server-aws#coupon-required'

// Covers an account never set up for storage and one whose allowance has run
// out or expired: the server answers both with the same coupon-required 403.
const NO_BATCH_STORAGE =
  "This account can't create batch storage right now. Contact whoever runs this deployment."

const SESSION_ENDED = 'Your session has ended. Sign in again, then try once more.'

// Thrown when the first save of a batch cannot create the batch's own storage
// space, so a refusal there can be told apart from a later write. Carries
// whatever the adapter threw as its cause.
export class SpaceCreationError extends Error {
  constructor(cause: unknown) {
    super('The batch space could not be created.', { cause })
    this.name = 'SpaceCreationError'
  }
}

// The HTTP status and problem type as read off an unknown error. The wallet's
// signed-request client puts the status on the error itself and the server's
// parsed problem body on `data`; WasError carries `status` and `type` as its
// own properties. Any of it may be missing, so read it all defensively.
function readProblem(error: unknown): { status?: number; type?: string; message?: string } {
  if (typeof error !== 'object' || error === null) {
    return {}
  }
  const { status, type, data, message } = error as {
    status?: unknown
    type?: unknown
    data?: unknown
    message?: unknown
  }
  const body = typeof data === 'object' && data !== null ? (data as { type?: unknown }) : undefined
  const problemType =
    typeof type === 'string' ? type : typeof body?.type === 'string' ? body.type : undefined
  return {
    status: typeof status === 'number' ? status : undefined,
    type: problemType,
    message: typeof message === 'string' ? message : undefined,
  }
}

// A signed-out or expired session: the wallet's adapter throws
// Error('UNAUTHORIZED'), this package throws 'Not logged in.' when there is no
// session, and a server may answer 401. Retrying cannot help; signing in can.
function isSessionEnded(error: unknown): boolean {
  const { status, message } = readProblem(error)
  return status === 401 || message === 'UNAUTHORIZED' || message === 'Not logged in.'
}

// Turns a failed request into a sentence saying what failed and what the
// person can do, and logs the raw error so the detail is not lost.
export function describeFailure(action: RequestAction, error: unknown): string {
  console.error(`Batch issuer: ${action} failed`, error)
  const cause = error instanceof SpaceCreationError ? error.cause : error
  if (isSessionEnded(cause)) {
    return SESSION_ENDED
  }
  if (error instanceof SpaceCreationError) {
    const { status, type } = readProblem(cause)
    // Creating the batch's space is refused with 403 on a deployment where
    // the account is not set up to create storage. The coupon-required
    // problem type confirms that when the server sent a body; a bare 403
    // here means the same thing.
    if (status === 403 || type === COUPON_REQUIRED) {
      return NO_BATCH_STORAGE
    }
  }
  return `${FAILED[action]} Please try again.`
}
