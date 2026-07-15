import type { LiveView } from './types'

const LIVE_KEY = 'dw:live:v1'
const channel = new BroadcastChannel('dungeon-wright-live')

export function publishLive(view: LiveView): void {
  localStorage.setItem(LIVE_KEY, JSON.stringify(view))
  channel.postMessage(view)
}

export function loadLive(): LiveView {
  const raw = localStorage.getItem(LIVE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as LiveView
    } catch {
      /* fall through to default */
    }
  }
  return { sceneImageId: null, tokens: [] }
}

export function subscribeLive(cb: (view: LiveView) => void): void {
  channel.addEventListener('message', (e: MessageEvent) => cb(e.data as LiveView))
}
