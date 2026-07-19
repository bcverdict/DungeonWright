import { computed, reactive, ref, watch } from 'vue'
import type {
  CharacterAsset,
  CharacterPlacement,
  LiveView,
  MapEdge,
  MapNodePosition,
  MusicTrack,
  SceneAsset,
  ScreenComposition,
} from './types'
import { defaultHomebrewSheet, defaultSheet } from './types'
import { ensureImageUrl, getAllImageBlobs, putImage, removeImage } from './imageStore'
import { publishLive } from './liveSync'
import { abilityCards, restoreAbilityCards, type AbilityCard } from './abilityCards'

const CAMPAIGNS_KEY = 'dw:campaigns:v1'
const ACTIVE_CAMPAIGN_KEY = 'dw:activeCampaign:v1'
/** Storage key from the single-campaign version of the app; migrated on first load. */
const LEGACY_STATE_KEY = 'dw:state:v1'

export interface CampaignMeta {
  id: string
  name: string
}

export function newId(): string {
  return crypto.randomUUID()
}

interface PersistedState {
  scenes: SceneAsset[]
  characters: CharacterAsset[]
  /** Last saved character layout for each scene (drives map indicators). */
  sceneCompositions: Record<string, CharacterPlacement[]>
  notes: Record<string, string>
  generalNotes: string
  musicTracks: MusicTrack[]
  /** Track ids attached to each scene. */
  sceneMusic: Record<string, string[]>
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
    musicTracks: [],
    sceneMusic: {},
    mapPositions: {},
    mapEdges: [],
    draft: emptyComposition(),
    committed: emptyComposition(),
    screenHistory: [],
    screenHistoryIndex: -1,
  }
}

function stateKey(campaignId: string): string {
  return `dw:state:v1:${campaignId}`
}

function loadCampaignList(): CampaignMeta[] {
  const raw = localStorage.getItem(CAMPAIGNS_KEY)
  if (raw) {
    try {
      const list = JSON.parse(raw) as CampaignMeta[]
      if (Array.isArray(list) && list.length > 0) return list
    } catch {
      /* corrupted list, start fresh */
    }
  }
  return []
}

export const campaigns = reactive<CampaignMeta[]>(loadCampaignList())

// First run, or migration from the single-campaign version of the app.
if (campaigns.length === 0) {
  const first: CampaignMeta = { id: newId(), name: 'My Campaign' }
  campaigns.push(first)
  const legacy = localStorage.getItem(LEGACY_STATE_KEY)
  if (legacy) {
    localStorage.setItem(stateKey(first.id), legacy)
    localStorage.removeItem(LEGACY_STATE_KEY)
  }
}

watch(
  campaigns,
  () => localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns)),
  { deep: true, immediate: true },
)

export const activeCampaignId = ref<string>(
  (() => {
    const saved = localStorage.getItem(ACTIVE_CAMPAIGN_KEY)
    return saved && campaigns.some((c) => c.id === saved) ? saved : campaigns[0]!.id
  })(),
)

watch(activeCampaignId, (id) => localStorage.setItem(ACTIVE_CAMPAIGN_KEY, id), {
  immediate: true,
})

export const activeCampaign = computed(
  () => campaigns.find((c) => c.id === activeCampaignId.value) ?? campaigns[0]!,
)

function loadStateFor(campaignId: string): PersistedState {
  const raw = localStorage.getItem(stateKey(campaignId))
  if (raw) {
    try {
      const loaded = { ...defaultState(), ...(JSON.parse(raw) as Partial<PersistedState>) }
      // Characters saved before sheets existed get default ones.
      for (const c of loaded.characters) {
        c.sheet = { ...defaultSheet(), ...c.sheet, abilities: { ...defaultSheet().abilities, ...c.sheet?.abilities } }
        c.homebrew = { ...defaultHomebrewSheet(), ...c.homebrew }
        c.sheetSystem ??= 'dnd5e'
      }
      return loaded
    } catch {
      /* corrupted state, start fresh */
    }
  }
  return defaultState()
}

export const state = reactive<PersistedState>(loadStateFor(activeCampaignId.value))

watch(
  state,
  () => localStorage.setItem(stateKey(activeCampaignId.value), JSON.stringify(state)),
  { deep: true },
)

// Hydrate object URLs for all known images.
for (const s of state.scenes) void ensureImageUrl(s.imageId)
for (const c of state.characters) void ensureImageUrl(c.imageId)

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
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
  state.characters.push({
    id: newId(),
    name,
    imageId,
    sheetSystem: 'dnd5e',
    sheet: defaultSheet(),
    homebrew: defaultHomebrewSheet(),
  })
}

export function renameScene(id: string, name: string): void {
  const s = state.scenes.find((s) => s.id === id)
  if (s) s.name = name
}

export async function deleteScene(id: string): Promise<void> {
  const scene = state.scenes.find((s) => s.id === id)
  if (!scene) return
  state.scenes = state.scenes.filter((s) => s.id !== id)
  delete state.sceneCompositions[id]
  delete state.notes[id]
  delete state.sceneMusic[id]
  delete state.mapPositions[id]
  state.mapEdges = state.mapEdges.filter((e) => e.a !== id && e.b !== id)
  if (state.draft.sceneId === id) state.draft.sceneId = null
  for (const comp of state.screenHistory) {
    if (comp.sceneId === id) comp.sceneId = null
  }
  // If the deleted scene is live, push the change to the player screen so it
  // doesn't keep showing an image whose blob no longer exists.
  if (state.committed.sceneId === id) {
    state.committed.sceneId = null
    publishLive(resolveLiveView(state.committed))
  }
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
  for (const comp of state.screenHistory) {
    comp.characters = comp.characters.filter((p) => p.characterId !== id)
  }
  if (state.committed.characters.some((p) => p.characterId === id)) {
    state.committed.characters = state.committed.characters.filter((p) => p.characterId !== id)
    publishLive(resolveLiveView(state.committed))
  }
  await removeImage(ch.imageId)
}

// ---------------------------------------------------------------------------
// Music library
// ---------------------------------------------------------------------------

export function addMusicTrack(title: string, url: string, notes: string): void {
  state.musicTracks.push({ id: newId(), title, url, notes })
}

export function updateMusicTrack(id: string, patch: Partial<Omit<MusicTrack, 'id'>>): void {
  const track = state.musicTracks.find((t) => t.id === id)
  if (track) Object.assign(track, patch)
}

export function deleteMusicTrack(id: string): void {
  state.musicTracks = state.musicTracks.filter((t) => t.id !== id)
  for (const key of Object.keys(state.sceneMusic)) {
    state.sceneMusic[key] = state.sceneMusic[key]!.filter((tid) => tid !== id)
  }
}

export function attachMusicToScene(trackId: string, sceneId: string): void {
  const list = (state.sceneMusic[sceneId] ??= [])
  if (!list.includes(trackId)) list.push(trackId)
}

export function detachMusicFromScene(trackId: string, sceneId: string): void {
  const list = state.sceneMusic[sceneId]
  if (list) state.sceneMusic[sceneId] = list.filter((tid) => tid !== trackId)
}

/** Tracks attached to the scene currently shown in the preview. */
export const currentSceneMusic = computed<MusicTrack[]>(() => {
  const sceneId = state.draft.sceneId
  if (!sceneId) return []
  const ids = state.sceneMusic[sceneId] ?? []
  return ids.flatMap((id) => {
    const track = state.musicTracks.find((t) => t.id === id)
    return track ? [track] : []
  })
})

// ---------------------------------------------------------------------------
// Draft editing
// ---------------------------------------------------------------------------

function saveDraftToSceneComposition(): void {
  if (state.draft.sceneId) {
    state.sceneCompositions[state.draft.sceneId] = clone(state.draft.characters)
  }
}

const DEFAULT_TOKEN_SCALE = 0.18
/** Default vertical center for new tokens, near the bottom of the stage. */
const DEFAULT_TOKEN_Y = 0.85

/** Whether (x, y) keeps clear of every existing token center. */
function isFreeSpot(x: number, y: number, others: CharacterPlacement[], scale: number): boolean {
  // Tokens are `scale` of the stage height tall; on a wide stage the same
  // token spans a smaller fraction of the width, hence the tighter x gap.
  return others.every(
    (p) => Math.abs(p.x - x) >= scale * 0.6 || Math.abs(p.y - y) >= scale * 0.95,
  )
}

/**
 * The spot itself if unoccupied, otherwise the nearest free spot found by
 * fanning out sideways and then row by row upward.
 */
function findFreeSpot(
  others: CharacterPlacement[],
  scale: number,
  startX = 0.5,
  startY = DEFAULT_TOKEN_Y,
): { x: number; y: number } {
  const stepX = scale * 0.62
  const stepY = scale
  for (let row = 0; row < 12; row++) {
    for (let i = 0; i < 25; i++) {
      const dir = i % 2 === 0 ? 1 : -1
      const x = startX + dir * Math.ceil(i / 2) * stepX
      const y = startY - row * stepY
      if (x < 0.04 || x > 0.96 || y < 0.06 || y > 0.96) continue
      if (isFreeSpot(x, y, others, scale)) return { x, y }
    }
  }
  return { x: startX, y: startY }
}

/** Switch the draft to a scene; characters on screen move along to it. */
export function switchToScene(sceneId: string | null): void {
  if (state.draft.sceneId === sceneId) return
  beginDraftEdit()
  const movers = clone(state.draft.characters)
  // The party travels with the transition, so it leaves the previous scene.
  if (state.draft.sceneId) state.sceneCompositions[state.draft.sceneId] = []
  const chars = sceneId ? clone(state.sceneCompositions[sceneId] ?? []) : []
  for (const m of movers) {
    if (chars.some((p) => p.characterId === m.characterId)) continue
    chars.push({ ...m, ...findFreeSpot(chars, m.scale, m.x, m.y) })
  }
  state.draft.sceneId = sceneId
  state.draft.characters = chars
  saveDraftToSceneComposition()
}

export function addCharacterToDraft(characterId: string, x = 0.5, y = DEFAULT_TOKEN_Y): void {
  beginDraftEdit()
  const spot = findFreeSpot(state.draft.characters, DEFAULT_TOKEN_SCALE, x, y)
  state.draft.characters.push({ characterId, ...spot, scale: DEFAULT_TOKEN_SCALE })
  saveDraftToSceneComposition()
}

export function removeCharacterFromDraft(index: number): void {
  beginDraftEdit()
  state.draft.characters.splice(index, 1)
  saveDraftToSceneComposition()
}

/** Keep the character in the scene but hide it from (or reveal it to) players. */
export function toggleCharacterHidden(index: number): void {
  const p = state.draft.characters[index]
  if (!p) return
  beginDraftEdit()
  // Delete rather than store `false` so the draft/committed comparison stays stable.
  if (p.hidden) delete p.hidden
  else p.hidden = true
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
    if (p.hidden) return []
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

// ---------------------------------------------------------------------------
// Campaign management
// ---------------------------------------------------------------------------

function activateCampaign(id: string): void {
  activeCampaignId.value = id
  Object.assign(state, loadStateFor(id))
  undoStack.length = 0
  redoStack.length = 0
  for (const s of state.scenes) void ensureImageUrl(s.imageId)
  for (const c of state.characters) void ensureImageUrl(c.imageId)
  // Keep the player window in step with the campaign being run.
  publishLive(resolveLiveView(state.committed))
}

export function switchCampaign(id: string): void {
  if (id === activeCampaignId.value || !campaigns.some((c) => c.id === id)) return
  activateCampaign(id)
}

export function createCampaign(name: string): void {
  const meta: CampaignMeta = { id: newId(), name }
  campaigns.push(meta)
  activateCampaign(meta.id)
}

export function renameCampaign(id: string, name: string): void {
  const c = campaigns.find((c) => c.id === id)
  if (c) c.name = name
}

// ---------------------------------------------------------------------------
// File backup (save / load everything as a single JSON file)
// ---------------------------------------------------------------------------

interface BackupFile {
  app: 'dungeon-wright'
  version: 1
  campaigns: CampaignMeta[]
  activeCampaignId: string
  states: Record<string, PersistedState>
  /** imageId -> data URL */
  images: Record<string, string>
  /** Absent in backups made before ability cards existed. */
  abilityCards?: AbilityCard[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Bundle every campaign, its state, and all images into one JSON blob. */
export async function exportBackup(): Promise<Blob> {
  const states: Record<string, PersistedState> = {}
  for (const c of campaigns) {
    states[c.id] = c.id === activeCampaignId.value ? clone(state) : loadStateFor(c.id)
  }
  const images: Record<string, string> = {}
  for (const [id, blob] of Object.entries(await getAllImageBlobs())) {
    images[id] = await blobToDataUrl(blob)
  }
  const data: BackupFile = {
    app: 'dungeon-wright',
    version: 1,
    campaigns: clone(campaigns) as CampaignMeta[],
    activeCampaignId: activeCampaignId.value,
    states,
    images,
    abilityCards: clone(abilityCards) as AbilityCard[],
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/**
 * Restore a backup produced by exportBackup, replacing all current data,
 * then reload the page so every module rehydrates from storage.
 */
export async function importBackup(json: string): Promise<void> {
  let data: BackupFile
  try {
    data = JSON.parse(json) as BackupFile
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (data.app !== 'dungeon-wright' || data.version !== 1 || !Array.isArray(data.campaigns)) {
    throw new Error('That file is not a Dungeon Wright backup.')
  }
  for (const [id, dataUrl] of Object.entries(data.images ?? {})) {
    const blob = await (await fetch(dataUrl)).blob()
    await putImage(id, blob)
  }
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(data.campaigns))
  for (const [cid, st] of Object.entries(data.states ?? {})) {
    localStorage.setItem(stateKey(cid), JSON.stringify(st))
  }
  const active = data.campaigns.some((c) => c.id === data.activeCampaignId)
    ? data.activeCampaignId
    : data.campaigns[0]!.id
  localStorage.setItem(ACTIVE_CAMPAIGN_KEY, active)
  if (Array.isArray(data.abilityCards)) restoreAbilityCards(data.abilityCards)
  location.reload()
}

export async function deleteCampaign(id: string): Promise<void> {
  const idx = campaigns.findIndex((c) => c.id === id)
  if (idx < 0) return
  const doomed = id === activeCampaignId.value ? state : loadStateFor(id)
  const imageIds = [
    ...doomed.scenes.map((s) => s.imageId),
    ...doomed.characters.map((c) => c.imageId),
  ]
  campaigns.splice(idx, 1)
  localStorage.removeItem(stateKey(id))
  if (campaigns.length === 0) campaigns.push({ id: newId(), name: 'My Campaign' })
  if (activeCampaignId.value === id) activateCampaign(campaigns[0]!.id)
  for (const imgId of imageIds) await removeImage(imgId)
}
