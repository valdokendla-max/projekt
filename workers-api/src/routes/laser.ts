import { Hono } from 'hono'
import type { Bindings, Variables } from '../bindings'
import { LASER_MACHINES, MATERIALS, getRecommendation } from '../data/laser-data.js'

const laser = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/machines
laser.get('/machines', (c) => c.json(LASER_MACHINES))

// GET /api/materials
laser.get('/materials', (c) => {
  const compact = MATERIALS.map((m) => ({
    id: m.id,
    name: m.name,
    thicknessRangeMm: m.thicknessRangeMm,
    note: m.note,
    supportedLaserTypes: Object.keys(m.profiles || {}),
  }))
  return c.json(compact)
})

// POST /api/recommendation
laser.post('/recommendation', async (c) => {
  const body = await c.req.json().catch(() => ({})) as {
    machineId?: unknown
    materialId?: unknown
    thicknessMm?: unknown
    mode?: unknown
  }

  const result = getRecommendation({
    machineId: String(body.machineId || ''),
    materialId: String(body.materialId || ''),
    thicknessMm: Number(body.thicknessMm),
    mode: String(body.mode || ''),
  })

  if (result.error) return c.json({ error: result.error }, 400)
  return c.json(result)
})

export default laser
