<script setup lang="ts">
import { ref } from 'vue'
import { state, addScene, deleteScene, renameScene, switchToScene } from '../store'
import { imageUrls } from '../imageStore'

const fileInput = ref<HTMLInputElement | null>(null)

async function onFiles(files: FileList | null): Promise<void> {
  if (!files) return
  for (const file of Array.from(files)) {
    const name = file.name.replace(/\.[^.]+$/, '')
    await addScene(name, file)
  }
  if (fileInput.value) fileInput.value.value = ''
}

function onRename(id: string, current: string): void {
  const name = prompt('Scene name', current)
  if (name?.trim()) renameScene(id, name.trim())
}

async function onDelete(id: string, name: string): Promise<void> {
  if (confirm(`Delete scene "${name}"? This also removes it from the map.`)) {
    await deleteScene(id)
  }
}
</script>

<template>
  <div class="panel">
    <button class="upload-btn" @click="fileInput?.click()">
      <i class="pi pi-plus"></i> Add scene images
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="onFiles(($event.target as HTMLInputElement).files)"
    />
    <p v-if="state.scenes.length === 0" class="hint">
      Upload scene artwork (maps, locations, battle backdrops). Click a scene to load it into the
      preview.
    </p>
    <div class="grid">
      <div
        v-for="s in state.scenes"
        :key="s.id"
        class="card"
        :class="{ active: state.draft.sceneId === s.id }"
        @click="switchToScene(s.id)"
      >
        <img :src="imageUrls[s.imageId]" alt="" />
        <div class="card-name" :title="s.name">{{ s.name }}</div>
        <div class="card-actions">
          <button title="Rename" @click.stop="onRename(s.id, s.name)">
            <i class="pi pi-pencil"></i>
          </button>
          <button title="Delete" @click.stop="onDelete(s.id, s.name)">
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.card {
  position: relative;
  border: 2px solid #2a3348;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #131722;
}
.card:hover {
  border-color: #4a5b83;
}
.card.active {
  border-color: #8b7cf6;
}
.card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}
</style>
