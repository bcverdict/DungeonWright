<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StageRenderer, { type StageToken } from '../components/StageRenderer.vue'
import ScenesPanel from '../components/ScenesPanel.vue'
import CharactersPanel from '../components/CharactersPanel.vue'
import MapPanel from '../components/MapPanel.vue'
import MusicPanel from '../components/MusicPanel.vue'
import CampaignSwitcher from '../components/CampaignSwitcher.vue'
import {
  state,
  isDirty,
  canUndo,
  canRedo,
  undo,
  redo,
  canPrevScreen,
  canNextScreen,
  goToScreen,
  commitToPlayerScreen,
  beginDraftEdit,
  updatePlacement,
  removeCharacterFromDraft,
  toggleCharacterHidden,
  addCharacterToDraft,
  clearDraft,
  currentScene,
  currentNotes,
  currentSceneMusic,
  detachMusicFromScene,
} from '../store'
import { imageUrls } from '../imageStore'
import type { ScreenComposition } from '../types'

const router = useRouter()

type Tab = 'scenes' | 'characters' | 'music'
const tab = ref<Tab>('scenes')
const sidebarCollapsed = ref(false)
const tabs: { id: Tab; label: string }[] = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'characters', label: 'Characters' },
  { id: 'music', label: 'Music' },
]

function compositionTokens(comp: ScreenComposition, showHidden = false): StageToken[] {
  return comp.characters.flatMap((p) => {
    if (p.hidden && !showHidden) return []
    const ch = state.characters.find((c) => c.id === p.characterId)
    if (!ch || !imageUrls[ch.imageId]) return []
    return [
      { url: imageUrls[ch.imageId]!, x: p.x, y: p.y, scale: p.scale, label: ch.name, hidden: p.hidden },
    ]
  })
}

function sceneUrl(comp: ScreenComposition): string | null {
  const scene = state.scenes.find((s) => s.id === comp.sceneId)
  return scene ? (imageUrls[scene.imageId] ?? null) : null
}

const draftTokens = computed(() => compositionTokens(state.draft, true))
const draftSceneUrl = computed(() => sceneUrl(state.draft))
const liveTokens = computed(() => compositionTokens(state.committed))
const liveSceneUrl = computed(() => sceneUrl(state.committed))

const liveSceneName = computed(() => {
  const s = state.scenes.find((s) => s.id === state.committed.sceneId)
  return s?.name ?? (state.committed.characters.length ? 'Characters only' : 'Blank')
})

function openPlayerWindow(): void {
  window.open('#/player', 'dungeon-wright-player', 'width=1280,height=720')
}

function onKeydown(e: KeyboardEvent): void {
  const inField =
    e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
  if (inField) return
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="dm-layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <template v-if="!sidebarCollapsed">
        <div class="brand-row">
          <div class="brand">Dungeon Wright</div>
          <button
            class="sidebar-toggle"
            title="Collapse sidebar"
            @click="sidebarCollapsed = true"
          >
            <i class="pi pi-angle-double-left"></i>
          </button>
        </div>
        <CampaignSwitcher />
        <nav class="tabs">
          <button
            v-for="t in tabs"
            :key="t.id"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </nav>
        <div class="sidebar-body">
          <ScenesPanel v-if="tab === 'scenes'" />
          <CharactersPanel v-else-if="tab === 'characters'" />
          <MusicPanel v-else />
        </div>
      </template>
      <button
        v-else
        class="sidebar-toggle"
        title="Expand sidebar"
        @click="sidebarCollapsed = false"
      >
        <i class="pi pi-angle-double-right"></i>
      </button>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="scene-title">
          <h1>{{ currentScene?.name ?? (state.draft.characters.length ? 'Characters only' : 'No scene selected') }}</h1>
          <span v-if="isDirty" class="badge dirty" title="The preview differs from what players see">
            <i class="pi pi-circle-fill"></i> Unpublished changes
          </span>
          <span v-else class="badge synced">
            <i class="pi pi-check"></i> Player screen up to date
          </span>
        </div>
        <div class="controls">
          <div class="btn-group" title="Undo / redo preview edits">
            <button :disabled="!canUndo" @click="undo()"><i class="pi pi-undo"></i> Undo</button>
            <button :disabled="!canRedo" @click="redo()">Redo <i class="pi pi-refresh"></i></button>
          </div>
          <div class="btn-group" title="Step through previously published player screens">
            <button :disabled="!canPrevScreen" @click="goToScreen(-1)">
              <i class="pi pi-chevron-left"></i> Prev screen
            </button>
            <button :disabled="!canNextScreen" @click="goToScreen(1)">
              Next screen <i class="pi pi-chevron-right"></i>
            </button>
          </div>
          <button class="ghost" :disabled="state.draft.characters.length === 0" @click="clearDraft()">
            Clear characters
          </button>
          <button class="primary" :disabled="!isDirty" @click="commitToPlayerScreen()">
            Update player screen
          </button>
          <button class="ghost" @click="openPlayerWindow()">
            Open player window <i class="pi pi-external-link"></i>
          </button>
          <button class="ghost" title="Edit and print 5×3 ability flashcards" @click="router.push('/ability-cards')">
            <i class="pi pi-id-card"></i> Ability cards
          </button>
        </div>
      </header>

      <div class="workspace">
        <section class="center-col">
          <div class="map-col">
            <div class="stage-header">
              <h2>Map</h2>
              <span class="hint">drag nodes to arrange · click a node to jump to that scene</span>
            </div>
            <MapPanel />
          </div>

          <div class="preview-col">
            <div class="stage-header">
              <h2>Preview</h2>
              <span class="hint">drag tokens to move · scroll or +/− to resize · click token for controls</span>
            </div>
            <div class="preview-stage-wrap">
              <StageRenderer
                :scene-url="draftSceneUrl"
                :tokens="draftTokens"
                editable
                @drag-start="beginDraftEdit()"
                @move="(i, x, y) => updatePlacement(i, { x, y })"
                @resize="(i, s) => updatePlacement(i, { scale: s })"
                @remove="removeCharacterFromDraft"
                @toggle-hidden="toggleCharacterHidden"
                @drop-character="(id, x, y) => addCharacterToDraft(id, x, y)"
              />
            </div>
          </div>
        </section>

        <section class="side-col">
          <div class="live-box" :class="{ stale: isDirty }">
            <div class="stage-header">
              <h2>Live player screen</h2>
              <span class="live-name">{{ liveSceneName }}</span>
            </div>
            <StageRenderer :scene-url="liveSceneUrl" :tokens="liveTokens" fade-scene />
          </div>

          <div v-if="currentScene" class="music-box">
            <h2>Music — {{ currentScene.name }}</h2>
            <p v-if="currentSceneMusic.length === 0" class="music-empty">
              No tracks attached. Add some in the Music tab.
            </p>
            <div v-for="t in currentSceneMusic" :key="t.id" class="music-track">
              <div class="music-track-row">
                <a :href="t.url" target="_blank" rel="noopener" :title="t.url">
                  <i class="pi pi-youtube"></i> {{ t.title }}
                </a>
                <button
                  title="Detach from this scene"
                  @click="detachMusicFromScene(t.id, currentScene.id)"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div v-if="t.notes" class="music-track-notes">{{ t.notes }}</div>
            </div>
          </div>

          <div class="notes-box">
            <h2>Notes — {{ currentScene?.name ?? 'General' }}</h2>
            <textarea
              v-model="currentNotes"
              placeholder="DM notes for this scene: read-aloud text, DCs, secrets, reminders…"
            ></textarea>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dm-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #10141f;
  border-right: 1px solid #232b3e;
  overflow: hidden;
  transition: width 0.2s ease;
}
.sidebar.collapsed {
  width: 44px;
  align-items: center;
  padding-top: 8px;
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid #232b3e;
}
.brand {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: #a99df8;
  white-space: nowrap;
}
.sidebar-toggle {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #3b4763;
  border-radius: 6px;
  background: #1a2030;
  color: #8b96ad;
  cursor: pointer;
}
.sidebar-toggle:hover {
  background: #242e45;
  color: #e2e8f0;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #232b3e;
}
.tabs button {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #8b96ad;
  cursor: pointer;
  font-size: 0.9rem;
}
.tabs button:hover {
  color: #cbd5e0;
}
.tabs button.active {
  color: #e2e8f0;
  border-bottom-color: #8b7cf6;
}
.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-bottom: 1px solid #232b3e;
  background: #131826;
}
.scene-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.scene-title h1 {
  font-size: 1.15rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge.dirty {
  background: #4c2e10;
  color: #fbd38d;
  border: 1px solid #9c5f1d;
}
.badge.synced {
  background: #173423;
  color: #9ae6b4;
  border: 1px solid #2f6f4b;
}
.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.btn-group {
  display: flex;
}
.btn-group button:first-child {
  border-radius: 6px 0 0 6px;
}
.btn-group button:last-child {
  border-radius: 0 6px 6px 0;
  border-left: none;
}
.controls button {
  padding: 7px 12px;
  border: 1px solid #3b4763;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
}
.controls button:hover:not(:disabled) {
  background: #242e45;
}
.controls button:disabled {
  opacity: 0.4;
  cursor: default;
}
.controls button.primary {
  background: #5a48c7;
  border-color: #8b7cf6;
  font-weight: 600;
}
.controls button.primary:hover:not(:disabled) {
  background: #6c5ae0;
}
.controls button.ghost {
  background: transparent;
}

.workspace {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  min-height: 0;
}
.center-col {
  flex: 1.6;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.map-col {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.map-col :deep(.map-panel) {
  flex: 1;
  min-height: 0;
  height: auto;
}
.preview-col {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.preview-stage-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: flex-start;
}
.preview-col :deep(.stage) {
  height: 100%;
  width: auto;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  margin: 0;
}
.side-col {
  flex: 1;
  min-width: 280px;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
}
.stage-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.stage-header h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b96ad;
  margin: 0;
}
.live-box.stale :deep(.stage) {
  outline: 2px solid #9c5f1d;
}
.live-name {
  font-size: 0.8rem;
  color: #8b96ad;
}
.music-box {
  max-height: 220px;
  overflow-y: auto;
}
.music-box h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b96ad;
  margin: 0 0 6px;
}
.music-empty {
  color: #6b7791;
  font-size: 0.82rem;
  margin: 0;
}
.music-track {
  border: 1px solid #2a3348;
  border-radius: 8px;
  background: #131722;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.music-track-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.music-track-row a {
  color: #a99df8;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.music-track-row a:hover {
  text-decoration: underline;
}
.music-track-row button {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #8b96ad;
  cursor: pointer;
  flex-shrink: 0;
}
.music-track-row button:hover {
  background: #3b4763;
  color: #e2e8f0;
}
.music-track-notes {
  margin-top: 4px;
  color: #8b96ad;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.notes-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 160px;
}
.notes-box h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b96ad;
  margin: 0 0 6px;
}
.notes-box textarea {
  flex: 1;
  resize: none;
  background: #131722;
  border: 1px solid #2a3348;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
}
.notes-box textarea:focus {
  outline: none;
  border-color: #8b7cf6;
}
</style>
