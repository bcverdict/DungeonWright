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

export async function ensureImageUrl(id: string): Promise<void> {
  if (imageUrls[id]) return
  const db = await openDb()
  const blob = await reqPromise<Blob | undefined>(db.transaction(STORE).objectStore(STORE).get(id))
  if (blob) imageUrls[id] = URL.createObjectURL(blob)
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
