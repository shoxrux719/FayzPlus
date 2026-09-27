type ApiRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
declare const process: { env: Record<string, string | undefined> }

const questionIds = ['reception', 'staff', 'consultation', 'explanation', 'cleanliness', 'waiting', 'rating', 'recommend'] as const
const serviceIds = ['consultation', 'endoscopy', 'neuralgia', 'spine', 'rehab', 'other']
const cleanSlug = (value: unknown) => typeof value === 'string' && /^[\p{L}\p{N}_-]{0,60}$/u.test(value)
const cleanText = (value: unknown, max: number) => typeof value === 'string' && value.length <= max
const phoneValid = (value: unknown) => typeof value === 'string' && /^\+?998\d{9}$/.test(value.replace(/[\s()\-]/g, ''))

function validate(body: unknown) {
  if (!body || typeof body !== 'object') return false
  const data = body as Record<string, unknown>
  if (data.website) return false
  if (!['uz', 'ru', 'en'].includes(String(data.language))) return false
  if (!cleanSlug(data.branch) || !cleanSlug(data.source) || !cleanSlug(data.doctor)) return false
  if (!serviceIds.includes(String(data.service))) return false
  if (!cleanText(data.comment, 2000) || !cleanText(data.name, 120) || !cleanText(data.phone, 30)) return false
  if (typeof data.wantsContact !== 'boolean') return false
  if (data.wantsContact && !phoneValid(data.phone)) return false
  if (typeof data.startedAt !== 'number' || Date.now() - data.startedAt < 2000 || Date.now() - data.startedAt > 24 * 60 * 60 * 1000) return false
  if (!data.answers || typeof data.answers !== 'object') return false
  const answers = data.answers as Record<string, unknown>
  if (!questionIds.every(id => typeof answers[id] === 'number' && Number.isInteger(answers[id]) && answers[id] >= (id === 'rating' ? 1 : 0) && answers[id] <= (id === 'rating' ? 5 : 2))) return false
  if (data.rating !== answers.rating) return false
  return true
}

function telegramMessage(data: Record<string, any>, submittedAt: string) {
  const labels: Record<string, string> = {
    reception: 'Қабулхона', staff: 'Ходимлар', consultation: 'Маслаҳат', explanation: 'Тушунтириш', cleanliness: 'Тозалик', waiting: 'Кутиш', recommend: 'Тавсия',
  }
  const answerText = (id: string, answer: number) => {
    if (id === 'reception' || id === 'cleanliness') return ['Ёмон', 'Яхши', 'Аъло'][answer]
    if (id === 'waiting') return ['Узоқ', 'Бироз', 'Йўқ'][answer]
    if (id === 'recommend') return ['Йўқ', 'Балки', 'Ҳа'][answer]
    return ['Йўқ', 'Қисман', 'Ҳа'][answer]
  }
  return [
    '🩺 ЯНГИ ФИКР-МУЛОҲАЗА · FAYZ PLUS',
    `Сана: ${submittedAt}`,
    `Тил: ${data.language} · Филиал: ${data.branch} · Манба: ${data.source}`,
    `Хизмат: ${data.service} · Шифокор: ${data.doctor || 'кўрсатилмаган'}`,
    ...questionIds.filter(id => id !== 'rating').map(id => `${labels[id]}: ${answerText(id, data.answers[id])}`),
    `Умумий баҳо: ${'⭐'.repeat(data.rating)} (${data.rating}/5)`,
    `Изоҳ: ${data.comment || 'йўқ'}`,
    `Боғланиш: ${data.wantsContact ? 'ҳа' : 'йўқ'}`,
    data.wantsContact ? `Исм: ${data.name || 'кўрсатилмаган'} · Телефон: ${data.phone}` : '',
  ].filter(Boolean).join('\n')
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const body = typeof request.body === 'string' ? (() => { try { return JSON.parse(request.body) } catch { return null } })() : request.body
  if (!validate(body)) return response.status(400).json({ error: 'Invalid feedback' })
  const data = body as Record<string, any>
  const submittedAt = new Date().toISOString()
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!((supabaseUrl && supabaseKey) || (botToken && chatId))) return response.status(503).json({ error: 'Delivery is not configured' })

  let delivered = false
  if (supabaseUrl && supabaseKey) {
    try {
      const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/feedback`, {
        method: 'POST',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          submitted_at: submittedAt, language: data.language, branch: data.branch, source: data.source,
          service: data.service, doctor: data.doctor, answers: data.answers, rating: data.rating,
          comment: data.comment, wants_contact: data.wantsContact,
          name: data.wantsContact ? data.name : '', phone: data.wantsContact ? data.phone : '',
        }),
      })
      if (result.ok) delivered = true
      else console.error('Supabase feedback insert failed', result.status)
    } catch (error) { console.error('Supabase feedback insert failed', error) }
  }
  if (botToken && chatId) {
    try {
      const result = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: telegramMessage(data, submittedAt) }),
      })
      if (result.ok) delivered = true
      else console.error('Telegram feedback delivery failed', result.status)
    } catch (error) { console.error('Telegram feedback delivery failed', error) }
  }
  if (!delivered) return response.status(502).json({ error: 'Delivery failed' })
  return response.status(200).json({ ok: true })
}
