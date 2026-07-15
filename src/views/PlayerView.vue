<script setup lang="ts">
import { computed, reactive, watchEffect } from 'vue'
import StageRenderer, { type StageToken } from '../components/StageRenderer.vue'
import { loadLive, subscribeLive } from '../liveSync'
import { ensureImageUrl, imageUrls } from '../imageStore'
import type { LiveView } from '../types'

const view = reactive<LiveView>(loadLive())

subscribeLive((next) => {
  view.sceneImageId = next.sceneImageId
  view.tokens = next.tokens
})

watchEffect(() => {
  if (view.sceneImageId) void ensureImageUrl(view.sceneImageId)
  for (const t of view.tokens) void ensureImageUrl(t.imageId)
})

const sceneUrl = computed(() =>
  view.sceneImageId ? (imageUrls[view.sceneImageId] ?? null) : null,
)

const tokens = computed<StageToken[]>(() =>
  view.tokens.flatMap((t) => {
    const url = imageUrls[t.imageId]
    return url ? [{ url, x: t.x, y: t.y, scale: t.scale }] : []
  }),
)
</script>

<template>
  <div class="player-screen">
    <StageRenderer :scene-url="sceneUrl" :tokens="tokens" />
  </div>
</template>

<style scoped>
.player-screen {
  height: 100vh;
  display: grid;
  place-items: center;
  background: #000;
  padding: 0;
}
.player-screen :deep(.stage) {
  max-height: 100vh;
  max-width: calc(100vh * 16 / 9);
  border-radius: 0;
  background: #000;
}
.player-screen :deep(.empty-scene) {
  color: #222;
}
</style>
