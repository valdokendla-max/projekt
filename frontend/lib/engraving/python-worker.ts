import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { bufferToDataUrl, fileExtensionForMediaType, parseDataUrl } from '@/lib/engraving/data-url'
import type { WorkerProcessingResult } from '@/lib/engraving/types'

interface PythonWorkerResponse {
  normalized_path: string
  optimized_path: string
  preview_path: string
  width: number
  height: number
  notes: string[]
}

interface PythonInvocation {
  command: string
  args: string[]
}

function resolveWorkerScriptPath() {
  return resolve(process.cwd(), '..', 'workers', 'image_optimizer', 'worker.py')
}

function getPythonInvocations(scriptPath: string, args: string[]): PythonInvocation[] {
  if (process.platform === 'win32') {
    return [
      { command: 'py', args: ['-3', scriptPath, ...args] },
      { command: 'python', args: [scriptPath, ...args] },
    ]
  }

  return [
    { command: 'python3', args: [scriptPath, ...args] },
    { command: 'python', args: [scriptPath, ...args] },
  ]
}

function executePython(invocation: PythonInvocation) {
  return new Promise<{ stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = spawn(invocation.command, invocation.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }

      rejectPromise(new Error(stderr.trim() || `${invocation.command} lõpetas veakoodiga ${code}.`))
    })
  })
}

async function runPythonWorker(scriptPath: string, args: string[]) {
  const invocations = getPythonInvocations(scriptPath, args)
  let lastError: Error | null = null

  for (const invocation of invocations) {
    try {
      return await executePython(invocation)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Python workeri käivitamine ebaõnnestus.')
    }
  }

  throw lastError || new Error('Python workeri käivitamine ebaõnnestus.')
}

export async function runImageOptimizerWorker(args: {
  sourceDataUrl: string
  requestedMode?: 'threshold' | 'dither' | 'vector'
}): Promise<WorkerProcessingResult> {
  const { mediaType, buffer } = parseDataUrl(args.sourceDataUrl)
  const scriptPath = resolveWorkerScriptPath()
  const workingDirectory = await fs.mkdtemp(join(tmpdir(), 'lasergraveerimine-worker-'))
  const inputPath = join(workingDirectory, `input.${fileExtensionForMediaType(mediaType)}`)
  const outputDirectory = join(workingDirectory, 'output')

  await fs.mkdir(outputDirectory, { recursive: true })
  await fs.writeFile(inputPath, buffer)

  try {
    const { stdout } = await runPythonWorker(scriptPath, [
      '--job-id',
      randomUUID(),
      '--input',
      inputPath,
      '--output-dir',
      outputDirectory,
      '--requested-mode',
      args.requestedMode || 'threshold',
    ])

    const response = JSON.parse(stdout) as PythonWorkerResponse
    const [normalizedBuffer, optimizedBuffer, previewBuffer] = await Promise.all([
      fs.readFile(response.normalized_path),
      fs.readFile(response.optimized_path),
      fs.readFile(response.preview_path),
    ])

    return {
      normalizedAsset: {
        dataUrl: bufferToDataUrl(normalizedBuffer, 'image/png'),
        mediaType: 'image/png',
        fileName: 'normalized.png',
        width: response.width,
        height: response.height,
        source: 'optimized',
      },
      optimizedAsset: {
        dataUrl: bufferToDataUrl(optimizedBuffer, 'image/png'),
        mediaType: 'image/png',
        fileName: 'optimized.png',
        width: response.width,
        height: response.height,
        source: 'optimized',
      },
      previewAsset: {
        dataUrl: bufferToDataUrl(previewBuffer, 'image/png'),
        mediaType: 'image/png',
        fileName: 'preview.png',
        width: response.width,
        height: response.height,
        source: 'optimized',
      },
      width: response.width,
      height: response.height,
      notes: response.notes,
    }
  } finally {
    await fs.rm(workingDirectory, { recursive: true, force: true })
  }
}