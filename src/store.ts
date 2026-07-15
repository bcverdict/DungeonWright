import { computed, reactive, watch } from 'vue'
import type {
  CharacterAsset,
  CharacterPlacement,
  LiveView,
  MapEdge,
  MapNodePosition,
  SceneAsset,
  ScreenComposition,
} from './types'
import { ensureImageUrl, putImage, removeImage } from './imageStore'
import { publishLive } from './liveSync'

const STATE_KEY = 'dw:state:v1'

interface PersistedState {
  scenes: SceneAsset[]
  characters: CharacterAsset[]
  /** Last saved character layout for each scene (drives map indicators). */
  sceneCompositions: Record<string, CharacterPlacement[]>
  notes: Record<string, string>
  generalNotes: string
  mapPositions: Record<string, MapNodePosition>
  mapEdges: MapEdge[]
  draft: ScreenComposition
  committed: ScreenComposition
  screenHistory: ScreenComposition[]
  screenHistoryIndex: number
}

function emptyComposition(): ScreenComposition {
  return { sceneId: null, characters: [] }
}

function defaultState(): PersistedState {
  return {
    scenes: [],
    characters: [],
    sceneCompositions: {},
    notes: {},
    generalNotes: '',
    mapPositions: {},
    mapEdges: [],
    draft: emptyComposition(),
    committed: emptyComposition(),
    screenHistory: [],
    screenHistoryIndex: -1,
  }
}

function loadState(): PersistedState {
  const raw = localStorage.getItem(STATE_KEY)
  if (raw) {
    try {
      return { ...defaultState(), ...(JSON.parse(raw) as Partial<PersistedState>) }
    } catch {
      /* corrupted state, start fresh */
    }
  }
  return defaultState()
}

export const state = reactive<PersistedState>(loadState())

watch(
  state,
  () => localStorage.setItem(STATE_KEY, JSON.stringify(state)),
  { deep: true },
)

// Hydrate object URLs for all known images.
for (const s of state.scenes) void ensureImageUrl(s.imageId)
for (const c of state.characters) void ensureImageUrl(c.imageId)

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function newId(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------------------
// Undo / redo of draft edits (in-memory, cleared on page load)
// ---------------------------------------------------------------------------

const undoStack = reactive<ScreenComposition[]>([])
const redoStack = reactive<ScreenComposition[]>([])
const UNDO_LIMIT = 100

/** Call before mutating the draft so the previous state can be restored. */
export function beginDraftEdit(): void {
  undoStack.push(clone(state.draft))
  if (undoStack.length > UNDO_LIMIT) undoStack.shift()
  redoStack.length = 0
}

export const canUndo = computed(() => undoStack.length > 0)
export const canRedo = computed(() => redoStack.length > 0)

export function undo(): void {
  const prev = undoStack.pop()
  if (!prev) return
  redoStack.push(clone(state.draft))
  state.draft = prev
}

export function redo(): void {
  const next = redoStack.pop()
  if (!next) return
  undoStack.push(clone(state.draft))
  state.draft = next
}

// ---------------------------------------------------------------------------
// Asset management
// ---------------------------------------------------------------------------

export async function addScene(name: string, file: Blob): Promise<void> {
  const imageId = newId()
  await putImage(imageId, file)
  const scene: SceneAsset = { id: newId(), name, imageId }
  state.scenes.push(scene)
  // Spread new map nodes so they don't stack on one point.
  const i = state.scenes.length - 1
  state.mapPositions[scene.id] = { x: 120 + (i % 4) * 180, y: 100 + Math.floor(i / 4) * 150 }
}

export async function addCharacter(name: string, file: Blob): Promise<void> {
  const imageId = newId()
  await putImage(imageId, file)
  state.characters.push({ id: newId(), name, imageId })
}

export function renameScene(id: string, name: string): void {
  const s = state.scenes.find((s) => s.id === id)
  if (s) s.name = name
}

export function renameCharacter(id: string, name: string): void {
  const c = state.characters.find((c) => c.id === id)
  if (c) c.name = name
}

export async function deleteScene(id: string): Promise<void> {
  const scene = state.scenes.find((s) => s.id === id)
  if (!scene) return
  state.scenes = state.scenes.filter((s) => s.id !== id)
  delete state.sceneCompositions[id]
  delete state.notes[id]
  delete state.mapPositions[id]
  state.mapEdges = state.mapEdges.filter((e) => e.a !== id && e.b !== id)
  if (state.draft.sceneId === id) state.draft.sceneId = null
  await removeImage(scene.imageId)
}

export async function deleteCharacter(id: string): Promise<void> {
  const ch = state.characters.find((c) => c.id === id)
  if (!ch) return
  state.characters = state.characters.filter((c) => c.id !== id)
  for (const key of Object.keys(state.sceneCompositions)) {
    state.sceneCompositions[key] = state.sceneCompositions[key]!.filter(
      (p) => p.characterId !== id,
    )
  }
  state.draft.characters = state.draft.characters.filter((p) => p.characterId !== id)
  await removeImage(ch.imageId)
}

// ---------------------------------------------------------------------------
// Draft editing
// ---------------------------------------------------------------------------

function saveDraftToSceneComposition(): void {
  if (state.draft.sceneId) {
    state.sceneCompositions[state.draft.sceneId] = clone(state.draft.characters)
  }
}

/** Switch the draft to a scene, restoring that scene's saved character layout. */
export function switchToScene(sceneId: string | null): void {
  if (state.draft.sceneId === sceneId) return
  beginDraftEdit()
  saveDraftToSceneComposition()
  state.draft.sceneId = sceneId
  state.draft.characters = sceneId ? clone(state.sceneCompositions[sceneId] ?? []) : []
}

export function addCharacterToDraft(characterId: string, x = 0.5, y = 0.7): void {
  beginDraftEdit()
  state.draft.characters.push({ characterId, x, y, scale: 0.28 })
  saveDraftToSceneComposition()
}

export function removeCharacterFromDraft(index: number): void {
  beginDraftEdit()
  state.draft.characters.splice(index, 1)
  saveDraftToSceneComposition()
}

/** Move/resize without pushing undo history; caller uses beginDraftEdit() at gesture start. */
export function updatePlacement(index: number, patch: Partial<CharacterPlacement>): void {
  const p = state.draft.characters[index]
  if (!p) return
  Object.assign(p, patch)
  saveDraftToSceneComposition()
}

export function clearDraft(): void {
  beginDraftEdit()
  state.draft.characters = []
  saveDraftToSceneComposition()
}

// ---------------------------------------------------------------------------
// Committing to the player screen + screen history
// ---------------------------------------------------------------------------

export const isDirty = computed(
  () => JSON.stringify(state.draft) !== JSON.stringify(state.committed),
)

function resolveLiveView(comp: ScreenComposition): LiveView {
  const scene = state.scenes.find((s) => s.id === comp.sceneId)
  const tokens = comp.characters.flatMap((p) => {
    const ch = state.characters.find((c) => c.id === p.characterId)
    return ch ? [{ imageId: ch.imageId, x: p.x, y: p.y, scale: p.scale }] : []
  })
  return { sceneImageId: scene?.imageId ?? null, tokens }
}

export function commitToPlayerScreen(): void {
  state.committed = clone(state.draft)
  const last = state.screenHistory[state.screenHistory.length - 1]
  if (!last || JSON.stringify(last) !== JSON.stringify(state.committed)) {
    state.screenHistory.push(clone(state.committed))
    if (state.screenHistory.length > 200) state.screenHistory.shift()
  }
  state.screenHistoryIndex = state.screenHistory.length - 1
  publishLive(resolveLiveView(state.committed))
}

export const canPrevScreen = computed(() => state.screenHistoryIndex > 0)
export const canNextScreen = computed(
  () => state.screenHistoryIndex < state.screenHistory.length - 1,
)

/** Load an earlier/later committed player screen into the draft for review. */
export function goToScreen(offset: -1 | 1): void {
  const target = state.screenHistoryIndex + offset
  const comp = state.screenHistory[target]
  if (!comp) return
  state.screenHistoryIndex = target
  beginDraftEdit()
  saveDraftToSceneComposition()
  state.draft = clone(comp)
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

export function toggleMapEdge(a: string, b: string): void {
  if (a === b) return
  const idx = state.mapEdges.findIndex(
    (e) => (e.a === a && e.b === b) || (e.a === b && e.b === a),
  )
  if (idx >= 0) state.mapEdges.splice(idx, 1)
  else state.mapEdges.push({ a, b })
}

/** Characters present in each scene (current scene reflects live draft edits). */
export const charactersByScene = computed<Record<string, CharacterAsset[]>>(() => {
  const result: Record<string, CharacterAsset[]> = {}
  const byId = new Map(state.characters.map((c) => [c.id, c]))
  const compFor = (sceneId: string): CharacterPlacement[] =>
    sceneId === state.draft.sceneId
      ? state.draft.characters
      : (state.sceneCompositions[sceneId] ?? [])
  for (const scene of state.scenes) {
    const seen = new Set<string>()
    result[scene.id] = compFor(scene.id).flatMap((p) => {
      if (seen.has(p.characterId)) return []
      seen.add(p.characterId)
      const ch = byId.get(p.characterId)
      return ch ? [ch] : []
    })
  }
  return result
})

export const currentScene = computed(
  () => state.scenes.find((s) => s.id === state.draft.sceneId) ?? null,
)

export const currentNotes = computed({
  get: () => (state.draft.sceneId ? (state.notes[state.draft.sceneId] ?? '') : state.generalNotes),
  set: (v: string) => {
    if (state.draft.sceneId) state.notes[state.draft.sceneId] = v
    else state.generalNotes = v
  },
})
