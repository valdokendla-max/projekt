import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Bindings, Variables } from './bindings'
import authRoutes from './routes/auth'
import conversationsRoutes from './routes/conversations'
import laserRoutes from './routes/laser'
import knowledgeRoutes from './routes/knowledge'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', logger())

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*'
      const allowed = [
        'https://vkengraveai.eu',
        'https://www.vkengraveai.eu',
        'https://laser-graveerimine.pages.dev',
      ]
      if (allowed.includes(origin)) return origin
      if (/^https:\/\/[a-f0-9]+\.laser-graveerimine\.pages\.dev$/.test(origin)) return origin
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
      return ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  }),
)

app.get('/', (c) => c.json({ ok: true, service: 'vkengraveai-api' }))

app.get('/api/health', async (c) => {
  let dbOk = false
  try {
    const row = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    dbOk = row?.ok === 1
  } catch {
    dbOk = false
  }
  return c.json({ ok: true, db: dbOk })
})

app.route('/api/auth', authRoutes)
app.route('/api/conversations', conversationsRoutes)
app.route('/api', laserRoutes)
app.route('/api/knowledge', knowledgeRoutes)

app.notFound((c) =>
  c.json({ ok: false, error: `Marsruut ei leitud: ${c.req.method} ${new URL(c.req.url).pathname}` }, 404),
)

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ ok: false, error: 'Sisemise serveri viga.' }, 500)
})

export default app
