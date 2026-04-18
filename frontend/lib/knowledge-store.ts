import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const KNOWLEDGE_CATEGORIES = ['juhis', 'naidis', 'fakt', 'stiil'] as const

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  category: KnowledgeCategory
  createdAt: string
}

export const KNOWLEDGE_FILE_PATH = join(process.cwd(), 'data', 'knowledge-store.json')

const DEFAULT_ITEMS: KnowledgeItem[] = [
  {
    id: 'seed-laser-graveerimise-roll',
    title: 'Laser Graveerimise roll',
    content:
      'Sa oled lasergraveerimise tehniline assistent. Eelista praktilisi seadeid, testsoovitusi ja ohutusjuhiseid.',
    category: 'juhis',
    createdAt: '2026-04-17T00:00:00.000Z',
  },
  {
    id: 'seed-soovituse-formaat',
    title: 'Soovituse formaat',
    content:
      'Kui kasutaja küsib seadistusi, vasta struktureeritult: kiirus (mm/min), võimsus (%), passid, joonevahe ja air assist.',
    category: 'juhis',
    createdAt: '2026-04-17T00:01:00.000Z',
  },
]

function isKnowledgeCategory(value: unknown): value is KnowledgeCategory {
  return typeof value === 'string' && KNOWLEDGE_CATEGORIES.includes(value as KnowledgeCategory)
}

function isKnowledgeItem(value: unknown): value is KnowledgeItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'string' &&
    isKnowledgeCategory(candidate.category)
  )
}

function sortItems(items: KnowledgeItem[]): KnowledgeItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function getDefaultItems(): KnowledgeItem[] {
  return DEFAULT_ITEMS.map((item) => ({ ...item }))
}

class KnowledgeStore {
  private items: KnowledgeItem[] = []
  private initialized = false
  private initializePromise: Promise<void> | null = null
  private operationQueue: Promise<void> = Promise.resolve()

  private async ensureInitialized() {
    if (this.initialized) {
      return
    }

    if (this.initializePromise) {
      await this.initializePromise
      return
    }

    this.initializePromise = (async () => {
      await mkdir(dirname(KNOWLEDGE_FILE_PATH), { recursive: true })

      try {
        const raw = await readFile(KNOWLEDGE_FILE_PATH, 'utf8')
        const parsed = JSON.parse(raw) as unknown

        if (!Array.isArray(parsed) || !parsed.every(isKnowledgeItem)) {
          throw new Error('Knowledge file is invalid.')
        }

        this.items = sortItems(parsed)
      } catch {
        this.items = getDefaultItems()
        await this.persist(this.items)
      }

      this.initialized = true
    })()

    try {
      await this.initializePromise
    } finally {
      this.initializePromise = null
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation)
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private async persist(items: KnowledgeItem[]) {
    const sortedItems = sortItems(items)
    const tempFilePath = `${KNOWLEDGE_FILE_PATH}.tmp`

    await writeFile(tempFilePath, `${JSON.stringify(sortedItems, null, 2)}\n`, 'utf8')
    await rename(tempFilePath, KNOWLEDGE_FILE_PATH)
  }

  async getAll(): Promise<KnowledgeItem[]> {
    await this.ensureInitialized()
    await this.operationQueue
    return sortItems(this.items)
  }

  async getByCategory(category: KnowledgeCategory): Promise<KnowledgeItem[]> {
    return (await this.getAll()).filter((item) => item.category === category)
  }

  async getContext(): Promise<string> {
    const items = await this.getAll()
    if (items.length === 0) return ''

    const sections: string[] = []

    const juhised = items.filter((item) => item.category === 'juhis')
    if (juhised.length > 0) {
      sections.push('## Juhised:\n' + juhised.map((item) => `- ${item.title}: ${item.content}`).join('\n'))
    }

    const naidised = items.filter((item) => item.category === 'naidis')
    if (naidised.length > 0) {
      sections.push('## Näidised:\n' + naidised.map((item) => `### ${item.title}\n${item.content}`).join('\n\n'))
    }

    const faktid = items.filter((item) => item.category === 'fakt')
    if (faktid.length > 0) {
      sections.push('## Faktid:\n' + faktid.map((item) => `- ${item.title}: ${item.content}`).join('\n'))
    }

    const stiilijuhised = items.filter((item) => item.category === 'stiil')
    if (stiilijuhised.length > 0) {
      sections.push(
        '## Stiilijuhised:\n' +
          stiilijuhised.map((item) => `- ${item.title}: ${item.content}`).join('\n'),
      )
    }

    return '\n\n--- TEADMISTEBAAS ---\n' + sections.join('\n\n')
  }

  async add(input: Omit<KnowledgeItem, 'id' | 'createdAt'>): Promise<KnowledgeItem> {
    await this.ensureInitialized()

    return this.enqueue(async () => {
      const previousItems = this.items
      const item: KnowledgeItem = {
        ...input,
        title: input.title.trim(),
        content: input.content.trim(),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }

      this.items = sortItems([...this.items, item])

      try {
        await this.persist(this.items)
        return item
      } catch (error) {
        this.items = previousItems
        throw error
      }
    })
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureInitialized()

    return this.enqueue(async () => {
      const previousItems = this.items
      const nextItems = this.items.filter((item) => item.id !== id)

      if (nextItems.length === this.items.length) {
        return false
      }

      this.items = nextItems

      try {
        await this.persist(this.items)
        return true
      } catch (error) {
        this.items = previousItems
        throw error
      }
    })
  }
}

export const knowledgeStore = new KnowledgeStore()
