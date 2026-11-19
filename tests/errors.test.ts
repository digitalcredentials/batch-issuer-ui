// The sentences a failed request is turned into: what failed and what the
// person can do.
//
//   npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeFailure, registrationCodeRefused } from '../src/lib/errors.ts'

// As the signed-request client throws: the status on the error, the
// server's parsed problem body on `data`
const httpError = (status: number, type?: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { status, ...(type && { data: { type } }) })

const QUOTA_EXCEEDED = 'https://w3id.org/pws#quota-exceeded'
const COUPON_REQUIRED = 'https://github.com/digitalcredentials/was-server-aws#coupon-required'
const TOO_MANY_BATCHES =
  'You have as many batches as the storage server allows for one issuer key. Delete a batch you no longer need, then save again.'

test.beforeEach(() => {
  // describeFailure logs the raw error; not part of what is checked here
  console.error = () => {}
})

test('a batch refused at the limit of spaces says to delete one', () => {
  assert.equal(describeFailure('save', httpError(507, QUOTA_EXCEEDED)), TOO_MANY_BATCHES)
  // The status alone, and the problem type alone, mean the same
  assert.equal(describeFailure('save', httpError(507)), TOO_MANY_BATCHES)
  assert.equal(describeFailure('save', Object.assign(new Error('x'), { type: QUOTA_EXCEEDED })), TOO_MANY_BATCHES)
})

test('only a save can meet the limit', () => {
  assert.equal(describeFailure('notify', httpError(507, QUOTA_EXCEEDED)), 'The recipients could not be notified. Please try again.')
  assert.equal(describeFailure('delete', httpError(507, QUOTA_EXCEEDED)), 'The batch could not be deleted. Please try again.')
})

test('a session that is gone says to sign in, whatever was being done', () => {
  const ended = 'Your session has ended. Sign in again, then try once more.'
  assert.equal(describeFailure('save', httpError(401)), ended)
  assert.equal(describeFailure('load-batches', new Error('UNAUTHORIZED')), ended)
  assert.equal(describeFailure('notify', new Error('Not logged in.')), ended)
})

test('anything else names the action and says to try again', () => {
  assert.equal(describeFailure('save', httpError(500)), 'The batch could not be saved. Please try again.')
  assert.equal(describeFailure('load-templates', new TypeError('Failed to fetch')), 'The templates could not be loaded. Please try again.')
  assert.equal(describeFailure('revoke', 'a string'), 'The credential could not be revoked. Please try again.')
})

test('a refused registration code is told from other failures of key creation', () => {
  assert.equal(registrationCodeRefused(httpError(403, COUPON_REQUIRED)), true)
  assert.equal(registrationCodeRefused(httpError(403)), true)
  assert.equal(registrationCodeRefused(httpError(507, QUOTA_EXCEEDED)), false)
  assert.equal(registrationCodeRefused(new TypeError('Failed to fetch')), false)
})
