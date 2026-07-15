<script setup lang="ts">
import { ref } from 'vue'
import { state, addCharacter, addCharacterToDraft, deleteCharacter, renameCharacter } from '../store'
import { imageUrls } from '../imageStore'

const fileInput = ref<HTMLInputElement | null>(null)

async function onFiles(files: FileList | null): Promise<void> {
  if (!files) return
  for (const file of Array.from(files)) {
    const name = file.name.replace(/\.[^.]+$/, '')
    await addCharacter(name, file)
  }
  if (fileInput.value) fileInput.value.value = ''
}

function onRename(id: string, current: string): void {
  const name = prompt('Character name', current)
  if (name?.trim()) renameCharacter(id, name.trim())
}

async function onDelete(id: string, name: string): Promise<void> {
  if (confirm(`Delete character "${name}"? This removes them from every scene.`)) {
    await deleteCharacter(id)
  }
}

function onDragStart(e: DragEvent, characterId: string): void {
  e.dataTransfer?.setData('application/x-dw-character', characterId)
}
</script>

<template>
  <div class="panel">
    <button class="upload-btn" @click="fileInput?.click()">+ Add character images</button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="onFiles(($event.target as HTMLInputElement).files)"
    />
    <p v-if="state.characters.length === 0" class="hint">
      Upload character art (PCs, NPCs, monsters). Click one to place it on the preview, or drag it
      onto the stage where you want it.
    </p>
    <div class="grid">
      <div
        v-for="c in state.characters"
        :key="c.id"
        class="card"
        draggable="true"
        title="Click or drag onto the preview to add"
        @click="addCharacterToDraft(c.id)"
        @dragstart="onDragStart($event, c.id)"
      >
        <img :src="imageUrls[c.imageId]" alt="" draggable="false" />
        <div class="card-name" :title="c.name">{{ c.name }}</div>
        <div class="card-actions">
          <button title="Rename" @click.stop="onRename(c.id, c.name)">✎</button>
          <button title="Delete" @click.stop="onDelete(c.id, c.name)">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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
.card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  display: block;
  background: #0b0e14;
}
</style>
