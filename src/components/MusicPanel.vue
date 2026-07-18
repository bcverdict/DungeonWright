<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  state,
  currentScene,
  addMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  attachMusicToScene,
  detachMusicFromScene,
} from '../store'

const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ title: '', url: '', notes: '' })

function resetForm(): void {
  form.title = ''
  form.url = ''
  form.notes = ''
  showAddForm.value = false
  editingId.value = null
}

function startAdd(): void {
  resetForm()
  showAddForm.value = true
}

function startEdit(id: string): void {
  const track = state.musicTracks.find((t) => t.id === id)
  if (!track) return
  form.title = track.title
  form.url = track.url
  form.notes = track.notes
  editingId.value = id
  showAddForm.value = false
}

const formValid = computed(() => form.title.trim() !== '' && form.url.trim() !== '')

function submit(): void {
  if (!formValid.value) return
  const data = { title: form.title.trim(), url: form.url.trim(), notes: form.notes.trim() }
  if (editingId.value) updateMusicTrack(editingId.value, data)
  else addMusicTrack(data.title, data.url, data.notes)
  resetForm()
}

function onDelete(id: string, title: string): void {
  if (confirm(`Delete track "${title}"? It will be removed from every scene.`)) {
    deleteMusicTrack(id)
    if (editingId.value === id) resetForm()
  }
}

function isAttachedToCurrentScene(trackId: string): boolean {
  const sceneId = state.draft.sceneId
  return sceneId !== null && (state.sceneMusic[sceneId] ?? []).includes(trackId)
}

function toggleAttach(trackId: string): void {
  const sceneId = state.draft.sceneId
  if (!sceneId) return
  if (isAttachedToCurrentScene(trackId)) detachMusicFromScene(trackId, sceneId)
  else attachMusicToScene(trackId, sceneId)
}
</script>

<template>
  <div class="panel">
    <button class="upload-btn" @click="startAdd"><i class="pi pi-plus"></i> Add YouTube track</button>

    <form v-if="showAddForm || editingId" class="track-form" @submit.prevent="submit">
      <div class="form-title">{{ editingId ? 'Edit track' : 'New track' }}</div>
      <input v-model="form.title" placeholder="Title (e.g. Intense)" />
      <input v-model="form.url" placeholder="YouTube URL" type="url" />
      <textarea
        v-model="form.notes"
        placeholder="Notes (e.g. Play this when they spring the trap)"
        rows="3"
      ></textarea>
      <div class="form-actions">
        <button type="submit" class="save" :disabled="!formValid">
          {{ editingId ? 'Save' : 'Add' }}
        </button>
        <button type="button" @click="resetForm">Cancel</button>
      </div>
    </form>

    <p v-if="state.musicTracks.length === 0 && !showAddForm" class="hint">
      Save YouTube links for your session music. Give each a title and a note about when to play
      it, then attach tracks to scenes so they appear automatically when you travel there.
    </p>

    <div class="track-list">
      <div v-for="t in state.musicTracks" :key="t.id" class="track">
        <div class="track-main">
          <a :href="t.url" target="_blank" rel="noopener" class="track-title" :title="t.url">
            <i class="pi pi-youtube"></i> {{ t.title }}
          </a>
          <div class="track-actions">
            <button title="Edit" @click="startEdit(t.id)"><i class="pi pi-pencil"></i></button>
            <button title="Delete" @click="onDelete(t.id, t.title)">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
        <div v-if="t.notes" class="track-notes">{{ t.notes }}</div>
        <button
          class="attach-btn"
          :class="{ attached: isAttachedToCurrentScene(t.id) }"
          :disabled="!currentScene"
          :title="currentScene ? '' : 'Select a scene first'"
          @click="toggleAttach(t.id)"
        >
          <i v-if="currentScene && isAttachedToCurrentScene(t.id)" class="pi pi-check"></i>
          {{
            !currentScene
              ? 'Select a scene to attach'
              : isAttachedToCurrentScene(t.id)
                ? `Attached to ${currentScene.name} — click to detach`
                : `Attach to ${currentScene.name}`
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #3b4763;
  border-radius: 8px;
  background: #131722;
}
.form-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b96ad;
}
.track-form input,
.track-form textarea {
  background: #0d1119;
  border: 1px solid #2a3348;
  border-radius: 6px;
  color: #e2e8f0;
  padding: 7px 9px;
  font-family: inherit;
  font-size: 0.85rem;
}
.track-form input:focus,
.track-form textarea:focus {
  outline: none;
  border-color: #8b7cf6;
}
.track-form textarea {
  resize: vertical;
}
.form-actions {
  display: flex;
  gap: 8px;
}
.form-actions button {
  flex: 1;
  padding: 7px;
  border: 1px solid #3b4763;
  border-radius: 6px;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
}
.form-actions button.save {
  background: #5a48c7;
  border-color: #8b7cf6;
  font-weight: 600;
}
.form-actions button:disabled {
  opacity: 0.4;
  cursor: default;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.track {
  border: 1px solid #2a3348;
  border-radius: 8px;
  padding: 10px;
  background: #131722;
}
.track-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.track-title {
  color: #a99df8;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.track-title:hover {
  text-decoration: underline;
}
.track-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.track-actions button {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: #1a2030;
  color: #cbd5e0;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}
.track-actions button:hover {
  background: #3b4763;
}
.track-notes {
  margin-top: 6px;
  color: #8b96ad;
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
}
.attach-btn {
  margin-top: 8px;
  width: 100%;
  padding: 6px;
  border: 1px solid #2a3348;
  border-radius: 6px;
  background: transparent;
  color: #8b96ad;
  cursor: pointer;
  font-size: 0.78rem;
}
.attach-btn:hover:not(:disabled) {
  border-color: #4a5b83;
  color: #e2e8f0;
}
.attach-btn.attached {
  border-color: #2f6f4b;
  color: #9ae6b4;
  background: #173423;
}
.attach-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
