import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

type CachedGlobal = typeof globalThis & {
  __laserGraveeriminePgPool?: Pool
}

function normalizeEnvValue(value: string | undefined) {
  return String(value || '').trim()
}

function getDatabaseUrl() {
  const databaseUrl =
    normalizeEnvValue(process.env.DATABASE_URL) ||
    normalizeEnvValue(process.env.POSTGRES_URL) ||
    normalizeEnvValue(process.env.POSTGRES_PRISMA_URL)

  if (!databaseUrl) {
    throw new Error('DATABASE_URL puudub. Lisa PostgreSQL ühendusstring serveri keskkonnamuutujatesse.')
  }

  return databaseUrl
}

function shouldUseSsl(databaseUrl: string) {
  const explicitMode = normalizeEnvValue(process.env.PGSSLMODE).toLowerCase()
  if (explicitMode === 'disable') {
    return false
  }

  const explicitSsl = normalizeEnvValue(process.env.DATABASE_SSL).toLowerCase()
  if (explicitSsl === 'false' || explicitSsl === '0') {
    return false
  }

  try {
    const parsed = new URL(databaseUrl)
    return !['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      !parsed.hostname.endsWith('.railway.internal')
  } catch {
    return true
  }
}

function getSslConfig(databaseUrl: string) {
  if (!shouldUseSsl(databaseUrl)) {
    return undefined
  }
  const rejectUnauthorized = normalizeEnvValue(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED).toLowerCase()
  return { rejectUnauthorized: rejectUnauthorized !== 'false' }
}

export function getPostgresPool() {
  const globalCache = globalThis as CachedGlobal

  if (!globalCache.__laserGraveeriminePgPool) {
    const databaseUrl = getDatabaseUrl()

    globalCache.__laserGraveeriminePgPool = new Pool({
      connectionString: databaseUrl,
      ssl: getSslConfig(databaseUrl),
      max: 10,
    })
  }

  return globalCache.__laserGraveeriminePgPool
}

export async function queryPostgres<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  return getPostgresPool().query<T>(text, values)
}

export async function withPostgresClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPostgresPool().connect()

  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export async function withPostgresTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  return withPostgresClient(async (client) => {
    await client.query('BEGIN')

    try {
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}
