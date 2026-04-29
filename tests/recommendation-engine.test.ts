import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { getRecommendation } = require('../backend/laser-data')

describe('recommendation engine', () => {
  it('returns concrete settings, duration estimate, and exports for a valid machine/material request', () => {
    const result = getRecommendation({
      machineId: 'xtool-d1-pro-10w',
      materialId: 'birch-plywood',
      thicknessMm: 3,
      mode: 'engrave',
      widthMm: 100,
      heightMm: 80,
    })

    expect(result.error).toBeUndefined()
    expect(result.machine).toMatchObject({
      id: 'xtool-d1-pro-10w',
      laserType: 'diode',
    })
    expect(result.material).toMatchObject({
      id: 'birch-plywood',
      thicknessMm: 3,
    })
    expect(result.settings.speedMmpm).toBeGreaterThan(0)
    expect(result.settings.powerPct).toBeGreaterThan(0)
    expect(result.estimates.requiresDimensions).toBe(false)
    expect(result.estimates.durationMinutes).toBeGreaterThan(0)
    expect(result.exports).toEqual(expect.arrayContaining(['png', 'svg', 'dxf', 'lbrn2', 'gcode']))
    expect(result.warnings.some((warning: string) => warning.includes('Hinnanguline tööaeg'))).toBe(true)
  })
})