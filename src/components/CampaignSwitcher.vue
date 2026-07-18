<script setup lang="ts">
import { ref } from 'vue'
import {
  campaigns,
  activeCampaign,
  activeCampaignId,
  switchCampaign,
  createCampaign,
  renameCampaign,
  deleteCampaign,
  exportBackup,
  importBackup,
} from '../store'

const importInput = ref<HTMLInputElement | null>(null)

async function onSaveToFile(): Promise<void> {
  const blob = await exportBackup()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dungeon-wright-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function onLoadFromFile(files: FileList | null): Promise<void> {
  const file = files?.[0]
  if (importInput.value) importInput.value.value = ''
  if (!file) return
  if (
    !confirm(
      `Load "${file.name}"? This replaces ALL campaigns currently in the app with the backup's contents.`,
    )
  ) {
    return
  }
  try {
    await importBackup(await file.text())
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Could not load that backup file.')
  }
}

function onSelect(e: Event): void {
  switchCampaign((e.target as HTMLSelectElement).value)
}

function onNew(): void {
  const name = prompt('Name for the new campaign / one-shot')
  if (name?.trim()) createCampaign(name.trim())
}

function onRename(): void {
  const name = prompt('Rename campaign', activeCampaign.value.name)
  if (name?.trim()) renameCampaign(activeCampaignId.value, name.trim())
}

async function onDelete(): Promise<void> {
  const name = activeCampaign.value.name
  if (
    confirm(
      `Delete "${name}" with all its scenes, characters, map, notes, and music? This cannot be undone.`,
    )
  ) {
    await deleteCampaign(activeCampaignId.value)
  }
}
</script>

<template>
  <div class="campaign-bar">
    <select :value="activeCampaignId" title="Switch campaign" @change="onSelect">
      <option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <button title="New campaign / one-shot" @click="onNew"><i class="pi pi-plus"></i></button>
    <button title="Rename campaign" @click="onRename"><i class="pi pi-pencil"></i></button>
    <button title="Delete campaign" @click="onDelete"><i class="pi pi-trash"></i></button>
  </div>
  <div class="backup-bar">
    <button title="Download every campaign and image as one backup file" @click="onSaveToFile">
      <i class="pi pi-download"></i> Save to file
    </button>
    <button title="Restore a backup file (replaces all current data)" @click="importInput?.click()">
      <i class="pi pi-upload"></i> Load from file
    </button>
    <input
      ref="importInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="onLoadFromFile(($event.target as HTMLInputElement).files)"
    />
  </div>
</template>

<style scoped>
.campaign-bar {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid #232b3e;
}
/* Chevron/arrow styling comes from the global `select` rule in style.css. */
.campaign-bar select {
  flex: 1;
  min-width: 0;
}
.campaign-bar button {
  width: 30px;
  border: 1px solid #2a3348;
  border-radius: 6px;
  background: #1a2030;
  color: #cbd5e0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}
.campaign-bar button:hover {
  background: #3b4763;
}
.campaign-bar {
  border-bottom: none;
  padding-bottom: 6px;
}
.backup-bar {
  display: flex;
  gap: 6px;
  padding: 0 12px 10px;
  border-bottom: 1px solid #232b3e;
}
.backup-bar button {
  flex: 1;
  padding: 6px 0;
  border: 1px solid #2a3348;
  border-radius: 6px;
  background: transparent;
  color: #8b96ad;
  cursor: pointer;
  font-size: 0.78rem;
}
.backup-bar button:hover {
  border-color: #4a5b83;
  color: #e2e8f0;
}
</style>
