const { execFileSync, spawn } = require('node:child_process')

const nextArgs = process.argv.slice(2)

if (nextArgs.length === 0) {
  nextArgs.push('dev')
}

function assignWindowsUserEnv(name) {
  if (process.env[name] || process.platform !== 'win32') {
    return
  }

  const value = getWindowsUserEnv(name)
  if (value) {
    process.env[name] = value
  }
}

function getWindowsUserEnv(name) {
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

assignWindowsUserEnv('GROQ_API_KEY')
assignWindowsUserEnv('OPENAI_API_KEY')
assignWindowsUserEnv('OPENAI_BASE_URL')
assignWindowsUserEnv('OPENAI_IMAGE_MODEL')
assignWindowsUserEnv('OPENAI_IMAGE_QUALITY')
assignWindowsUserEnv('NEXT_PUBLIC_BACKEND_URL')

const nextCli = require.resolve('next/dist/bin/next')

const child = spawn(process.execPath, [nextCli, ...nextArgs], {
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
