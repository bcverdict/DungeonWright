<script setup lang="ts">
import { computed, ref } from 'vue'
import { state, charactersByScene, switchToScene, toggleMapEdge } from '../store'
import { imageUrls } from '../imageStore'

const NODE_W = 120
const NODE_H = 76

const svgEl = ref<SVGSVGElement | null>(null)
const connectMode = ref(false)
const connectFrom = ref<string | null>(null)

const canvasSize = computed(() => {
  let maxX = 700
  let maxY = 500
  for (const pos of Object.values(state.mapPositions)) {
    maxX = Math.max(maxX, pos.x + NODE_W + 60)
    maxY = Math.max(maxY, pos.y + NODE_H + 80)
  }
  return { w: maxX, h: maxY }
})

const edges = computed(() =>
  state.mapEdges.flatMap((e) => {
    const a = state.mapPositions[e.a]
    const b = state.mapPositions[e.b]
    if (!a || !b) return []
    return [
      {
        x1: a.x + NODE_W / 2,
        y1: a.y + NODE_H / 2,
        x2: b.x + NODE_W / 2,
        y2: b.y + NODE_H / 2,
      },
    ]
  }),
)

function svgPoint(e: PointerEvent): { x: number; y: number } {
  const rect = svgEl.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onNodePointerDown(e: PointerEvent, sceneId: string): void {
  e.preventDefault()
  if (connectMode.value) {
    if (connectFrom.value === null) {
      connectFrom.value = sceneId
    } else {
      toggleMapEdge(connectFrom.value, sceneId)
      connectFrom.value = null
    }
    return
  }

  const start = svgPoint(e)
  const orig = { ...state.mapPositions[sceneId]! }
  let moved = false
  const target = e.currentTarget as SVGGElement
  target.setPointerCapture(e.pointerId)

  const onMove = (ev: PointerEvent): void => {
    const p = svgPoint(ev)
    const dx = p.x - start.x
    const dy = p.y - start.y
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true
    if (moved) {
      state.mapPositions[sceneId] = {
        x: Math.max(0, orig.x + dx),
        y: Math.max(0, orig.y + dy),
      }
    }
  }
  const onUp = (): void => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    if (!moved) switchToScene(sceneId)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
}

function toggleConnectMode(): void {
  connectMode.value = !connectMode.value
  connectFrom.value = null
}
</script>

<template>
  <div class="panel map-panel">
    <div class="map-toolbar">
      <button :class="{ toggled: connectMode }" @click="toggleConnectMode">
        {{ connectMode ? 'Connecting: pick two scenes' : 'Connect scenes' }}
      </button>
    </div>
    <p v-if="state.scenes.length === 0" class="hint">
      Add scenes first — each scene becomes a node here. Drag nodes to arrange, use "Connect
      scenes" to link them, and click a node to jump to that scene.
    </p>
    <div v-else class="map-scroll">
      <svg
        ref="svgEl"
        :width="canvasSize.w"
        :height="canvasSize.h"
        class="map-svg"
      >
        <line
          v-for="(e, i) in edges"
          :key="i"
          :x1="e.x1"
          :y1="e.y1"
          :x2="e.x2"
          :y2="e.y2"
          stroke="#3b4763"
          stroke-width="2.5"
        />
        <g
          v-for="s in state.scenes"
          :key="s.id"
          class="node"
          :transform="`translate(${state.mapPositions[s.id]?.x ?? 0}, ${state.mapPositions[s.id]?.y ?? 0})`"
          @pointerdown="onNodePointerDown($event, s.id)"
        >
          <rect
            :width="NODE_W"
            :height="NODE_H"
            rx="8"
            :class="{
              current: state.draft.sceneId === s.id,
              live: state.committed.sceneId === s.id,
              'connect-from': connectFrom === s.id,
            }"
            class="node-rect"
          />
          <image
            v-if="imageUrls[s.imageId]"
            :href="imageUrls[s.imageId]"
            x="4"
            y="4"
            :width="NODE_W - 8"
            :height="NODE_H - 26"
            preserveAspectRatio="xMidYMid slice"
            style="pointer-events: none"
          />
          <text :x="NODE_W / 2" :y="NODE_H - 8" text-anchor="middle" class="node-label">
            {{ s.name.length > 16 ? s.name.slice(0, 15) + '…' : s.name }}
          </text>
          <!-- character presence indicators -->
          <g v-for="(ch, ci) in (charactersByScene[s.id] ?? []).slice(0, 6)" :key="ch.id">
            <circle
              :cx="12 + ci * 22"
              :cy="NODE_H + 14"
              r="11"
              class="char-dot"
            />
            <clipPath :id="`clip-${s.id}-${ch.id}`">
              <circle :cx="12 + ci * 22" :cy="NODE_H + 14" r="10" />
            </clipPath>
            <image
              v-if="imageUrls[ch.imageId]"
              :href="imageUrls[ch.imageId]"
              :x="2 + ci * 22"
              :y="NODE_H + 4"
              width="20"
              height="20"
              preserveAspectRatio="xMidYMid slice"
              :clip-path="`url(#clip-${s.id}-${ch.id})`"
              style="pointer-events: none"
            >
              <title>{{ ch.name }}</title>
            </image>
          </g>
        </g>
      </svg>
    </div>
    <p class="hint legend">
      <span class="swatch purple"></span> previewing
      <span class="swatch green"></span> live on player screen
    </p>
  </div>
</template>

<style scoped>
.map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.map-toolbar {
  margin-bottom: 8px;
}
.map-toolbar button {
  padding: 8px 14px;
  border: 1px solid #3b4763;
  border-radius: 6px;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
}
.map-toolbar button.toggled {
  background: #4c3d8f;
  border-color: #8b7cf6;
}
.map-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid #2a3348;
  border-radius: 8px;
  background:
    radial-gradient(#1c2333 1px, transparent 1px) 0 0 / 24px 24px,
    #10141f;
}
.node {
  cursor: pointer;
}
.node-rect {
  fill: #1a2030;
  stroke: #3b4763;
  stroke-width: 2;
}
.node-rect.live {
  stroke: #48bb78;
}
.node-rect.current {
  stroke: #8b7cf6;
  stroke-width: 3;
}
.node-rect.connect-from {
  stroke: #f6ad55;
  stroke-width: 3;
}
.node-label {
  fill: #cbd5e0;
  font-size: 11px;
  pointer-events: none;
}
.char-dot {
  fill: #10141f;
  stroke: #4a5b83;
  stroke-width: 1.5;
}
.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.swatch.purple {
  background: #8b7cf6;
}
.swatch.green {
  background: #48bb78;
}
.legend .swatch.green {
  margin-left: 12px;
}
</style>
