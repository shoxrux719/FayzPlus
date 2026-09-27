import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import feedback from './api/feedback'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [react(), {
      name: 'local-feedback-api',
      configureServer(server) {
        server.middlewares.use('/api/feedback', async (request, response) => {
          let body = ''
          for await (const chunk of request) {
            body += chunk
            if (body.length > 16000) {
              response.statusCode = 413
              response.end(JSON.stringify({ error: 'Request too large' }))
              return
            }
          }
          const reply = {
            status(code: number) { response.statusCode = code; return reply },
            json(data: unknown) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(data)) },
            setHeader(name: string, value: string) { response.setHeader(name, value) },
          }
          await feedback({ method: request.method, body, headers: request.headers }, reply)
        })
      },
    }],
  }
})
