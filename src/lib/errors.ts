// Server calls fail with whatever threw: the signed-request HTTP client, the
// PWS client (PwsError), or a plain Error. None of those messages mean
// anything to the person running a batch, and some carry a URL and a status
// code. So every failed request is translated here into a sentence saying
// what failed and what the person can do.

// What the person was doing when the request failed; the sentence shown names
// the action.
export type RequestAction =
  | 'load-batches'
  | 'load-templates'
  | 'save'
  | 'notify'
  | 'resend'
  | 'revoke'
  | 'delete'

const FAILED: Record<RequestAction, string> = {
  'load-batches': 'The batches could not be loaded.',
  'load-templates': 'The templates could not be loaded.',
  save: 'The batch could not be saved.',
  notify: 'The recipients could not be notified.',
  resend: 'The notification could not be resent.',
  revoke: 'The credential could not be revoked.',
  delete: 'The batch could not be deleted.',
}

// The PWS server's problem type for the creation of the issuer's own space
// when it does not accept the registration code (its "coupon"): a code that
// was never valid, and one that has run out or expired.
const COUPON_REQUIRED = 'https://github.com/digitalcredentials/was-server-aws#coupon-required'

const SESSION_ENDED = 'Your session has ended. Sign in again, then try once more.'

// The HTTP status and problem type as read off an unknown error. The
// signed-request client puts the status on the error itself and the server's
// parsed problem body on `data`; PwsError carries `status` and `type` as its
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

// A session that is gone: the adapter throws Error('UNAUTHORIZED') and the
// batch screens throw 'Not logged in.' when there is no session, and a server
// may answer 401. Retrying cannot help; signing in can.
function isSessionEnded(error: unknown): boolean {
  const { status, message } = readProblem(error)
  return status === 401 || message === 'UNAUTHORIZED' || message === 'Not logged in.'
}

// True when the creation of the issuer's own space was refused over its
// registration code: the PWS server's coupon-required 403. A bare 403 there
// means the same thing. No other request carries the code.
export function registrationCodeRefused(error: unknown): boolean {
  const { status, type } = readProblem(error)
  return status === 403 || type === COUPON_REQUIRED
}

// Turns a failed request into a sentence saying what failed and what the
// person can do, and logs the raw error so the detail is not lost.
export function describeFailure(action: RequestAction, error: unknown): string {
  console.error(`Batch issuer: ${action} failed`, error)
  if (isSessionEnded(error)) {
    return SESSION_ENDED
  }
  return `${FAILED[action]} Please try again.`
}
