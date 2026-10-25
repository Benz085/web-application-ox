import type { Data, Db, DbTx, DocSnap, ListOptions } from '../../db.js'

export interface FakeDb extends Db {
  /** Number of read operations (get / queryEq / list) performed so far. */
  readonly reads: number
  /** Number of committed write operations (set / update / createIfAbsent). */
  readonly writes: number
  /** Direct seed (not counted as a read or write). */
  seed(collection: string, id: string, data: Data): void
  /** Direct peek at stored data (not counted). */
  peek(collection: string, id: string): Data | undefined
  /** All stored docs of a collection (not counted). */
  all(collection: string): DocSnap[]
  /** Make every subsequent read throw (to simulate an unreadable backend). */
  failReads(error: Error): void
  resetCounters(): void
}

const clone = (d: Data): Data => structuredClone(d)

export function createFakeDb(): FakeDb {
  const store = new Map<string, Map<string, Data>>()
  let reads = 0
  let writes = 0
  let idCounter = 0
  let readError: Error | null = null

  const col = (name: string): Map<string, Data> => {
    let c = store.get(name)
    if (!c) {
      c = new Map()
      store.set(name, c)
    }
    return c
  }
  const checkRead = () => {
    reads++
    if (readError) throw readError
  }
  const doGet = (collection: string, id: string): Data | null => {
    checkRead()
    const d = col(collection).get(id)
    return d ? clone(d) : null
  }
  const doQueryEq = (collection: string, field: string, value: unknown): DocSnap[] => {
    checkRead()
    return [...col(collection).entries()]
      .filter(([, d]) => d[field] === value)
      .map(([id, d]) => ({ id, data: clone(d) }))
  }

  const db: FakeDb = {
    get reads() {
      return reads
    },
    get writes() {
      return writes
    },
    seed: (c, id, data) => void col(c).set(id, clone(data)),
    peek: (c, id) => {
      const d = col(c).get(id)
      return d ? clone(d) : undefined
    },
    all: (c) => [...col(c).entries()].map(([id, d]) => ({ id, data: clone(d) })),
    failReads: (e) => {
      readError = e
    },
    resetCounters: () => {
      reads = 0
      writes = 0
    },
    async get(c, id) {
      return doGet(c, id)
    },
    async queryEq(c, f, v) {
      return doQueryEq(c, f, v)
    },
    async list(c, opts: ListOptions = {}) {
      checkRead()
      let docs = [...col(c).entries()].map(([id, d]) => ({ id, data: clone(d) }))
      if (opts.orderBy) {
        const { field, direction } = opts.orderBy
        const sign = direction === 'asc' ? 1 : -1
        docs = docs.sort((a, b) => {
          const x = a.data[field] as number
          const y = b.data[field] as number
          return x === y ? 0 : x < y ? -sign : sign
        })
      }
      return opts.limit === undefined ? docs : docs.slice(0, opts.limit)
    },
    async createIfAbsent(c, id, data) {
      if (col(c).has(id)) return false
      col(c).set(id, clone(data))
      writes++
      return true
    },
    async runTransaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
      const pending: Array<() => void> = []
      let wrote = false
      const staged = (c: string, id: string): Data | undefined => col(c).get(id)
      const noReadAfterWrite = () => {
        if (wrote) throw new Error('Firestore transactions require all reads before writes')
      }
      const tx: DbTx = {
        async get(c, id) {
          noReadAfterWrite()
          return doGet(c, id)
        },
        async queryEq(c, f, v) {
          noReadAfterWrite()
          return doQueryEq(c, f, v)
        },
        newId: (c) => `${c}-${++idCounter}`,
        set(c, id, data) {
          wrote = true
          const copy = clone(data)
          pending.push(() => void col(c).set(id, copy))
        },
        update(c, id, patch) {
          wrote = true
          const copy = clone(patch)
          pending.push(() => {
            const cur = staged(c, id)
            if (!cur) throw new Error(`update of missing document ${c}/${id}`)
            col(c).set(id, { ...cur, ...copy })
          })
        },
      }
      const result = await fn(tx) // on throw nothing is committed
      for (const p of pending) p()
      writes += pending.length
      return result
    },
  }
  return db
}
