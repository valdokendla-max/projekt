import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { POST as exportRoute } from '@/app/api/engraving-export/route'
import { bufferToDataUrl } from '@/lib/engraving/data-url'

const JSZipModulePath = path.join(process.cwd(), 'frontend', 'node_modules', 'jszip', 'lib', 'index.js')

describe('export ZIP manifest', () => {
  it('embeds export-manifest.json and settings.json into the generated archive', async () => {
    const pngDataUrl = bufferToDataUrl(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7LxQAAAAASUVORK5CYII=', 'base64'),
      'image/png',
    )

    const request = new Request('http://localhost/api/engraving-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'threshold',
        includeVector: false,
        assets: [
          {
            path: 'exports/output.png',
            mediaType: 'image/png',
            description: 'Primary raster',
            dataUrl: pngDataUrl,
          },
        ],
      }),
    })

    const response = await exportRoute(request)
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      ok: boolean
      archiveBase64: string
      exportManifest: { artifacts: Array<{ path: string }> }
      lightBurnProject: { fileName: string }
    }

    expect(payload.ok).toBe(true)
    expect(payload.exportManifest.artifacts.map((artifact) => artifact.path)).toEqual(
      expect.arrayContaining(['exports/output.png', 'exports/settings.json', 'exports/export-manifest.json']),
    )

    const JSZip = (await import(JSZipModulePath)).default
    const zip = await JSZip.loadAsync(Buffer.from(payload.archiveBase64, 'base64'))
    const manifestText = await zip.file('exports/export-manifest.json')?.async('string')
    const settingsText = await zip.file('exports/settings.json')?.async('string')
    const lightBurnText = await zip.file(`exports/${payload.lightBurnProject.fileName}`)?.async('string')

    expect(manifestText).toBeTruthy()
    expect(settingsText).toBeTruthy()
    expect(lightBurnText).toContain('<LightBurnProject')

    const manifest = JSON.parse(String(manifestText)) as {
      exportManifest: { artifacts: Array<{ path: string }> }
    }

    expect(manifest.exportManifest.artifacts.map((artifact) => artifact.path)).toEqual(
      expect.arrayContaining(['exports/output.png', 'exports/settings.json', 'exports/export-manifest.json']),
    )
  })
})