<script setup lang="ts">
import { ref } from 'vue'

export interface StageToken {
  url: string
  x: number
  y: number
  scale: number
  label?: string
  /** Rendered ghosted on the DM preview; never sent to the player screen. */
  hidden?: boolean
}

const props = defineProps<{
  sceneUrl: string | null
  tokens: StageToken[]
  editable?: boolean
  /** Cross-fade when the scene changes (used on the player screen). */
  fadeScene?: boolean
}>()

const emit = defineEmits<{
  dragStart: []
  move: [index: number, x: number, y: number]
  resize: [index: number, scale: number]
  remove: [index: number]
  toggleHidden: [index: number]
  dropCharacter: [characterId: string, x: number, y: number]
}>()

const stageEl = ref<HTMLElement | null>(null)
const selected = ref<number | null>(null)

function stageFraction(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const rect = stageEl.value!.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  }
}

let dragging = false

function onTokenPointerDown(e: PointerEvent, index: number): void {
  if (!props.editable) return
  e.preventDefault()
  selected.value = index
  dragging = false
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)

  const onMove = (ev: PointerEvent): void => {
    if (!dragging) {
      dragging = true
      emit('dragStart')
    }
    const { x, y } = stageFraction(ev)
    emit('move', index, x, y)
  }
  const onUp = (): void => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
}

function onTokenWheel(e: WheelEvent, index: number): void {
  if (!props.editable) return
  e.preventDefault()
  const token = props.tokens[index]
  if (!token) return
  emit('dragStart')
  const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
  emit('resize', index, Math.min(1.5, Math.max(0.05, token.scale * factor)))
}

function nudgeScale(index: number, dir: 1 | -1): void {
  const token = props.tokens[index]
  if (!token) return
  emit('dragStart')
  const factor = dir > 0 ? 1.15 : 1 / 1.15
  emit('resize', index, Math.min(1.5, Math.max(0.05, token.scale * factor)))
}

function onStagePointerDown(e: PointerEvent): void {
  if (e.target === stageEl.value || (e.target as HTMLElement).classList.contains('scene-img')) {
    selected.value = null
  }
}

function onDrop(e: DragEvent): void {
  if (!props.editable) return
  const characterId = e.dataTransfer?.getData('application/x-dw-character')
  if (!characterId) return
  e.preventDefault()
  const { x, y } = stageFraction(e)
  emit('dropCharacter', characterId, x, y)
}
</script>

<template>
  <div
    ref="stageEl"
    class="stage"
    :class="{ 'fade-scene': fadeScene }"
    @pointerdown="onStagePointerDown"
    @dragover.prevent
    @drop="onDrop"
  >
    <Transition name="scene-fade">
      <img
        v-if="sceneUrl"
        :key="sceneUrl"
        :src="sceneUrl"
        class="scene-img"
        alt=""
        draggable="false"
      />
      <div v-else class="empty-scene">No scene</div>
    </Transition>

    <div
      v-for="(t, i) in tokens"
      :key="i"
      class="token"
      :class="{ selected: editable && selected === i, editable, hidden: t.hidden }"
      :style="{
        left: t.x * 100 + '%',
        top: t.y * 100 + '%',
        height: t.scale * 100 + '%',
      }"
      @pointerdown="onTokenPointerDown($event, i)"
      @wheel="onTokenWheel($event, i)"
    >
      <img :src="t.url" alt="" draggable="false" />
      <div v-if="editable && selected === i" class="token-controls" @pointerdown.stop>
        <button title="Smaller" @click="nudgeScale(i, -1)"><i class="pi pi-minus"></i></button>
        <button title="Larger" @click="nudgeScale(i, 1)"><i class="pi pi-plus"></i></button>
        <button
          :title="t.hidden ? 'Show to players' : 'Hide from players'"
          @click="emit('toggleHidden', i)"
        >
          <i class="pi" :class="t.hidden ? 'pi-eye-slash' : 'pi-eye'"></i>
        </button>
        <button class="danger" title="Remove from screen" @click="emit('remove', i)">
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div v-if="editable && selected === i && t.label" class="token-label">{{ t.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #0b0e14;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
}
.scene-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: auto;
}
.fade-scene .scene-fade-enter-active,
.fade-scene .scene-fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-scene .scene-fade-enter-from,
.fade-scene .scene-fade-leave-to {
  opacity: 0;
}
.empty-scene {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #4a5568;
  font-size: 1.1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.token {
  position: absolute;
  transform: translate(-50%, -50%);
  touch-action: none;
}
.token.editable {
  cursor: grab;
}
.token img {
  height: 100%;
  width: auto;
  display: block;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
}
.token.selected {
  outline: 2px dashed #8b7cf6;
  outline-offset: 3px;
}
.token.hidden img {
  opacity: 0.35;
  filter: grayscale(0.7) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
}
.token-controls {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: #1a2030;
  border: 1px solid #313b52;
  border-radius: 6px;
  padding: 3px;
}
.token-controls button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: #2a3348;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.token-controls button:hover {
  background: #3b4763;
}
.token-controls button.danger {
  background: #4c2530;
  color: #feb2b2;
}
.token-controls button.danger:hover {
  background: #6b2f3f;
}
.token-label {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 12, 18, 0.85);
  color: #cbd5e0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
</style>
