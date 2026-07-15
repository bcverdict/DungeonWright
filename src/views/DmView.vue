<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StageRenderer, { type StageToken } from '../components/StageRenderer.vue'
import ScenesPanel from '../components/ScenesPanel.vue'
import CharactersPanel from '../components/CharactersPanel.vue'
import MapPanel from '../components/MapPanel.vue'
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
  addCharacterToDraft,
  clearDraft,
  currentScene,
  currentNotes,
} from '../store'
import { imageUrls } from '../imageStore'
import type { ScreenComposition } from '../types'

type Tab = 'scenes' | 'characters' | 'map'
const tab = ref<Tab>('scenes')
const tabs: { id: Tab; label: string }[] = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'characters', label: 'Characters' },
  { id: 'map', label: 'Map' },
]

function compositionTokens(comp: ScreenComposition): StageToken[] {
  return comp.characters.flatMap((p) => {
    const ch = state.characters.find((c) => c.id === p.characterId)
    if (!ch || !imageUrls[ch.imageId]) return []
    return [{ url: imageUrls[ch.imageId]!, x: p.x, y: p.y, scale: p.scale, label: ch.name }]
  })
}

function sceneUrl(comp: ScreenComposition): string | null {
  const scene = state.scenes.find((s) => s.id === comp.sceneId)
  return scene ? (imageUrls[scene.imageId] ?? null) : null
}

const draftTokens = computed(() => compositionTokens(state.draft))
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
    <aside class="sidebar">
      <div class="brand">Dungeon Wright</div>
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
        <MapPanel v-else />
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="scene-title">
          <h1>{{ currentScene?.name ?? (state.draft.characters.length ? 'Characters only' : 'No scene selected') }}</h1>
          <span v-if="isDirty" class="badge dirty" title="The preview differs from what players see">
            ● Unpublished changes
          </span>
          <span v-else class="badge synced">✓ Player screen up to date</span>
        </div>
        <div class="controls">
          <div class="btn-group" title="Undo / redo preview edits">
            <button :disabled="!canUndo" @click="undo()">↩ Undo</button>
            <button :disabled="!canRedo" @click="redo()">Redo ↪</button>
          </div>
          <div class="btn-group" title="Step through previously published player screens">
            <button :disabled="!canPrevScreen" @click="goToScreen(-1)">‹ Prev screen</button>
            <button :disabled="!canNextScreen" @click="goToScreen(1)">Next screen ›</button>
          </div>
          <button class="ghost" :disabled="state.draft.characters.length === 0" @click="clearDraft()">
            Clear characters
          </button>
          <button class="primary" :disabled="!isDirty" @click="commitToPlayerScreen()">
            Update player screen
          </button>
          <button class="ghost" @click="openPlayerWindow()">Open player window ⧉</button>
        </div>
      </header>

      <div class="workspace">
        <section class="preview-col">
          <div class="stage-header">
            <h2>Preview</h2>
            <span class="hint">drag tokens to move · scroll or +/− to resize · click token for controls</span>
          </div>
          <StageRenderer
            :scene-url="draftSceneUrl"
            :tokens="draftTokens"
            editable
            @drag-start="beginDraftEdit()"
            @move="(i, x, y) => updatePlacement(i, { x, y })"
            @resize="(i, s) => updatePlacement(i, { scale: s })"
            @remove="removeCharacterFromDraft"
            @drop-character="(id, x, y) => addCharacterToDraft(id, x, y)"
          />
        </section>

        <section class="side-col">
          <div class="live-box" :class="{ stale: isDirty }">
            <div class="stage-header">
              <h2>Live player screen</h2>
              <span class="live-name">{{ liveSceneName }}</span>
            </div>
            <StageRenderer :scene-url="liveSceneUrl" :tokens="liveTokens" />
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
}
.brand {
  padding: 14px 16px;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: #a99df8;
  border-bottom: 1px solid #232b3e;
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
  overflow: auto;
}
.preview-col {
  flex: 1.6;
  min-width: 0;
}
.side-col {
  flex: 1;
  min-width: 280px;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
