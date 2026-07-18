import { reactive } from 'vue'

const DB_NAME = 'dungeon-wright'
const DB_VERSION = 1
const STORE = 'images'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function reqPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Reactive map of imageId -> object URL, filled lazily from IndexedDB. */
export const imageUrls = reactive<Record<string, string>>({})

export async function putImage(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await reqPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, id))
  imageUrls[id] = URL.createObjectURL(blob)
}

const pendingLoads = new Map<string, Promise<void>>()

export async function ensureImageUrl(id: string): Promise<void> {
  if (imageUrls[id]) return
  // Dedupe concurrent calls so the same image never gets two object URLs
  // (which would leak one and needlessly swap the src).
  let pending = pendingLoads.get(id)
  if (!pending) {
    pending = (async () => {
      const db = await openDb()
      const blob = await reqPromise<Blob | undefined>(
        db.transaction(STORE).objectStore(STORE).get(id),
      )
      if (blob && !imageUrls[id]) imageUrls[id] = URL.createObjectURL(blob)
    })().finally(() => pendingLoads.delete(id))
    pendingLoads.set(id, pending)
  }
  return pending
}

/** All stored images, keyed by image id (used for file backups). */
export async function getAllImageBlobs(): Promise<Record<string, Blob>> {
  const db = await openDb()
  const store = db.transaction(STORE).objectStore(STORE)
  const [keys, values] = await Promise.all([
    reqPromise(store.getAllKeys()),
    reqPromise(store.getAll() as IDBRequest<Blob[]>),
  ])
  const result: Record<string, Blob> = {}
  keys.forEach((key, i) => {
    result[String(key)] = values[i]!
  })
  return result
}

export async function removeImage(id: string): Promise<void> {
  const db = await openDb()
  await reqPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id))
  const url = imageUrls[id]
  if (url) {
    URL.revokeObjectURL(url)
    delete imageUrls[id]
  }
}
