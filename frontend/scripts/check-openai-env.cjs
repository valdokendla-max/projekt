const { execFileSync } = require('node:child_process')

function readWindowsUserEnv(name) {
  if (process.platform !== 'win32') {
    return ''
  }

  try {
    return execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `[Environment]::GetEnvironmentVariable('${name}', 'User')`,
      ],
      { encoding: 'utf8' }
    ).trim()
  } catch {
    return ''
  }
}

function maskKey(value) {
  if (!value) {
    return 'missing'
  }

  if (value.length <= 8) {
    return 'present'
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

async function main() {
  const processKey = String(process.env.OPENAI_API_KEY || '').trim()
  const userKey = readWindowsUserEnv('OPENAI_API_KEY')
  const resolvedKey = processKey || userKey
  const baseUrl = (process.env.OPENAI_BASE_URL || readWindowsUserEnv('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')

  console.log(`OPENAI_API_KEY process env: ${maskKey(processKey)}`)
  console.log(`OPENAI_API_KEY user env: ${maskKey(userKey)}`)
  console.log(`OPENAI base URL: ${baseUrl}`)

  if (!resolvedKey) {
    console.log('Result: missing key')
    process.exitCode = 1
    return
  }

  if (resolvedKey.startsWith('gsk_')) {
    console.log('Result: invalid key type (looks like a Groq key)')
    process.exitCode = 1
    return
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${resolvedKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      console.log('Result: key accepted by provider')
      return
    }

    const payload = await response.json().catch(() => null)
    const providerMessage = payload?.error?.message || `HTTP ${response.status}`
    console.log(`Result: provider rejected key (${providerMessage})`)
    process.exitCode = 1
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.log(`Result: validation request failed (${message})`)
    process.exitCode = 1
  }
}

void main()