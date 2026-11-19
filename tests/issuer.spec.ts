// The app end to end, in a browser, against real services: the PWS server
// its build names, and the batch issuer API its build names. It creates an
// issuer key of its own under a fresh email, so it needs a registration code
// the PWS server accepts, and it deletes everything it created. The code is
// spent once, on the issuer key: the test checks that no other request
// carries it and that the browser does not keep it.
//
//   REGISTRATION_CODE=... npm run test:e2e                      # the local dev server
//   REGISTRATION_CODE=... BASE_URL=https://batch.lcw-sandbox.org npm run test:e2e
//
// Notify really sends: the one recipient is Amazon SES's mailbox simulator
// (NOTIFY_RECIPIENT to change it), which accepts the message and delivers it
// to nobody.
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

const REGISTRATION_CODE = process.env.REGISTRATION_CODE
const PWS_BASE_URL = (process.env.PWS_BASE_URL ?? 'https://was.lcw-sandbox.org').replace(/\/+$/, '')
const RECIPIENT = process.env.NOTIFY_RECIPIENT ?? 'success@simulator.amazonses.com'

const EMAIL = `issuer-e2e+${Date.now()}@example.org`
const PASSPHRASE = `e2e passphrase ${Date.now()}`

test.skip(!REGISTRATION_CODE, 'REGISTRATION_CODE is not set')

// What the browser reports while a test runs, printed when it ends, so a
// failure shows the request or error behind it
function capture(page: Page): string[] {
  const noise: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') noise.push(`[console.error] ${message.text()}`)
  })
  page.on('requestfailed', (request) =>
    noise.push(`[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText}`)
  )
  page.on('response', (response) => {
    if (response.status() >= 400) noise.push(`[response ${response.status()}] ${response.request().method()} ${response.url()}`)
  })
  return noise
}

// The requests the page sends that carry the registration code in their
// body ("METHOD /path"), and the ones that create a space. Playwright cannot
// read the signed-request client's bodies off the network, so the page
// reports each one as it is handed to fetch; the report goes to this
// process, where a reload does not lose it.
interface SpaceRequests {
  withCode: string[]
  created: { path: string; body: string }[]
}

async function watchSpaceCreation(page: Page): Promise<SpaceRequests> {
  const seen: SpaceRequests = { withCode: [], created: [] }
  await page.exposeFunction('__reportRequest', (method: string, path: string, body: string) => {
    if (body.includes(REGISTRATION_CODE!)) {
      seen.withCode.push(`${method} ${path}`)
    }
    if (method === 'POST' && /^\/(spaces\/|space\/[^/]+\/spaces)$/.test(path)) {
      seen.created.push({ path, body })
    }
  })
  await page.addInitScript(() => {
    type Reporting = { __reportRequest: (method: string, path: string, body: string) => void }
    const send = window.fetch.bind(window)
    window.fetch = (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init)
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        void request
          .clone()
          .text()
          .then((body) =>
            (window as unknown as Reporting).__reportRequest(request.method, new URL(request.url).pathname, body)
          )
      }
      return send(request)
    }
  })
  return seen
}

async function signIn(page: Page, passphrase = PASSPHRASE) {
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.afterAll(() => {
  if (!REGISTRATION_CODE) {
    return
  }
  const report = execFileSync('npx', ['tsx', 'tests/helpers/delete-spaces.ts'], {
    env: { ...process.env, ISSUER_EMAIL: EMAIL, ISSUER_PASSPHRASE: PASSPHRASE, PWS_BASE_URL },
    encoding: 'utf8',
  })
  console.log(`cleanup: ${report.trim()}`)
})

test('refuses an email and passphrase that have no issuer key', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`nobody+${Date.now()}@example.org`)
  await page.getByLabel('Passphrase', { exact: true }).fill('a passphrase nobody chose')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('No issuer key matches that email and passphrase')
  await expect(page.getByRole('heading', { name: 'Credential batches' })).toHaveCount(0)
})

test('creates an issuer key, issues a batch, and signs in again', async ({ page }) => {
  const noise = capture(page)
  const spaces = await watchSpaceCreation(page)
  try {
    await page.goto('/')

    await test.step('a registration code the server does not accept is refused', async () => {
      await page.getByRole('button', { name: 'Create an issuer key' }).click()
      await page.getByLabel('Email').fill(EMAIL)
      await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE)
      await page.getByLabel('Passphrase again').fill(PASSPHRASE)
      await page.getByLabel('Registration code').fill('not-a-registration-code')
      await page.getByRole('button', { name: 'Create issuer key' }).click()
      await expect(page.getByRole('alert')).toContainText('That registration code was not accepted')
    })

    await test.step('the issuer key is created with a code it accepts', async () => {
      await page.getByLabel('Registration code').fill(REGISTRATION_CODE!)
      await page.getByRole('button', { name: 'Create issuer key' }).click()
      await expect(page.getByRole('heading', { name: 'Credential batches' })).toBeVisible()
      await expect(page.getByText(`Signed in as ${EMAIL}`)).toBeVisible()
      await expect(page.getByText('No batches yet.')).toBeVisible()
    })

    await test.step('signing in needs the passphrase the key was made with', async () => {
      await page.getByRole('button', { name: 'Sign out' }).click()
      await signIn(page, `${PASSPHRASE} mistyped`)
      await expect(page.getByRole('alert')).toContainText('No issuer key matches that email and passphrase')
      await signIn(page)
      await expect(page.getByRole('heading', { name: 'Credential batches' })).toBeVisible()
    })

    await test.step('the code is not kept: not in this tab, and nowhere to enter it again', async () => {
      const stored = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))
      expect(stored).toContain(EMAIL)
      expect(stored).not.toContain(REGISTRATION_CODE!)
      await expect(page.getByRole('button', { name: 'Registration code' })).toHaveCount(0)
    })

    const batchName = `E2E batch ${Date.now()}`
    await test.step('a batch is saved into a space of its own, created under the issuer space with no code', async () => {
      await page.getByRole('button', { name: 'New batch' }).click()
      await page.getByLabel('Batch name').fill(batchName)
      await page.getByLabel('Issuer name').fill('E2E Issuer')
      await page.getByLabel('Template').selectOption('conference')
      await page.getByLabel('CSV').setInputFiles({
        name: 'recipients.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(`recipientName,recipientEmail,conferenceName\nE2E Recipient,${RECIPIENT},E2E Summit\n`),
      })
      await expect(page.getByText('1 row', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Save batch' }).click()
      await expect(page.getByText('Saved', { exact: true })).toBeVisible()
      // Three space creations so far: the refused code, the issuer space,
      // and the batch space, which is a request to the issuer space and
      // carries no code
      await expect
        .poll(() => spaces.created.map(({ path }) => path.replace(/space\/[^/]+\//, 'space/{issuer}/')))
        .toEqual(['/spaces/', '/spaces/', '/space/{issuer}/spaces'])
      expect(JSON.parse(spaces.created[1].body)).toHaveProperty('coupon', REGISTRATION_CODE)
      expect(JSON.parse(spaces.created[2].body)).not.toHaveProperty('coupon')
    })

    await test.step('the editor fits a phone screen', async () => {
      const desktop = page.viewportSize()!
      await page.setViewportSize({ width: 390, height: 800 })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)
      await expect(page.getByRole('button', { name: 'Notify recipients' })).toBeInViewport({ ratio: 1 })
      await page.setViewportSize(desktop)
    })

    await test.step('the recipient is notified, and the batch then locks', async () => {
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Notify recipients' }).click()
      await expect(page.getByText('Emailed 1 recipient.')).toBeVisible({ timeout: 90_000 })
      await expect(page.getByText('The recipients have been notified')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Activity log' })).toBeVisible()
      await expect(page.getByText('Notifications sent to 1 recipient')).toBeVisible()
      // The log row is joined to the recipient through the credId written
      // back onto the batch's row
      await expect(page.getByRole('cell', { name: /E2E Recipient/ })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Resend Notifications' })).toBeVisible()
    })

    await test.step('the session survives a reload, and the batch is listed', async () => {
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Credential batches' })).toBeVisible()
      const row = page.getByRole('listitem').filter({ hasText: batchName })
      await expect(row).toContainText('1 recipient')
      await expect(row).toContainText('issuer: E2E Issuer')
      await row.getByRole('button', { name: 'Open' }).click()
      await expect(page.getByRole('heading', { name: batchName })).toBeVisible()
      await expect(page.getByText('The recipients have been notified')).toBeVisible()
    })

    await test.step('the batch is deleted with its space', async () => {
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Credential batches' })).toBeVisible()
      await expect(page.getByText('No batches yet.')).toBeVisible()
    })

    await test.step('signing out discards the session', async () => {
      await page.getByRole('button', { name: 'Sign out' }).click()
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    })

    // Through everything above, the code went to the server in one request
    expect(spaces.withCode).toEqual(['POST /spaces/'])
  } finally {
    if (noise.length) {
      console.log(`--- browser noise ---\n${noise.join('\n')}`)
    }
  }
})
