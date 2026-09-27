import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'

const code = buildSync({ entryPoints: ['api/feedback.ts'], bundle: true, platform: 'node', format: 'esm', write: false }).outputFiles[0].text
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

function response() {
  return {
    code: 0, body: null,
    setHeader() {},
    status(code) { this.code = code; return this },
    json(body) { this.body = body },
  }
}

function feedback() {
  return {
    language: 'uz', branch: 'chinobod', source: 'reception', service: 'consultation', doctor: 'unknown',
    answers: { reception: 2, staff: 2, consultation: 2, explanation: 1, cleanliness: 2, waiting: 2, rating: 5, recommend: 2 },
    rating: 5, comment: 'Хизмат яхши', wantsContact: false, name: '', phone: '', startedAt: Date.now() - 5000, website: '',
  }
}

test('feedback delivery', async t => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN
  const oldChat = process.env.TELEGRAM_CHAT_ID
  const oldSupabaseUrl = process.env.SUPABASE_URL
  const oldSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const oldFetch = globalThis.fetch
  try {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    await t.test('rejects incomplete answers', async () => {
      const bad = feedback()
      delete bad.answers.reception
      const res = response()
      await handler({ method: 'POST', body: bad, headers: {} }, res)
      assert.equal(res.code, 400)
    })

    await t.test('does not claim delivery without a configured channel', async () => {
      const res = response()
      await handler({ method: 'POST', body: feedback(), headers: {} }, res)
      assert.equal(res.code, 503)
    })

    await t.test('delivers feedback through Telegram when configured', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token'
      process.env.TELEGRAM_CHAT_ID = '123'
      let sent = null
      globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true } }
      const res = response()
      await handler({ method: 'POST', body: feedback(), headers: {} }, res)
      assert.equal(res.code, 200)
      assert.equal(sent.chat_id, '123')
      assert.match(sent.text, /FAYZ PLUS/)
      assert.match(sent.text, /Хизмат яхши/)
    })
  } finally {
    globalThis.fetch = oldFetch
    for (const [key, value] of Object.entries({ TELEGRAM_BOT_TOKEN: oldToken, TELEGRAM_CHAT_ID: oldChat, SUPABASE_URL: oldSupabaseUrl, SUPABASE_SERVICE_ROLE_KEY: oldSupabaseKey })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
