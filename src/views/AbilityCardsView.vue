<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  ABILITY_ART,
  ART_KEYS,
  abilityCards,
  addAbilityCard,
  artLabel,
  deleteAbilityCard,
} from '../abilityCards'

const router = useRouter()

function goBack(): void {
  router.push('/')
}

function printCards(): void {
  window.print()
}

function onDelete(id: string, title: string): void {
  if (confirm(`Delete the "${title}" card?`)) deleteAbilityCard(id)
}
</script>

<template>
  <div class="cards-page">
    <header class="cards-topbar">
      <button class="bar-btn" @click="goBack">
        <i class="pi pi-arrow-left"></i> Back to campaign
      </button>
      <div class="topbar-center">
        <h1>Ability cards</h1>
        <span class="hint">5in × 3in flashcards — edit below, then print and cut</span>
      </div>
      <div class="topbar-right">
        <button class="bar-btn" @click="addAbilityCard()">
          <i class="pi pi-plus"></i> New card
        </button>
        <button class="bar-btn primary" @click="printCards()">
          <i class="pi pi-print"></i> Print
        </button>
      </div>
    </header>

    <div class="cards-list">
      <div v-for="card in abilityCards" :key="card.id" class="card-row">
        <div class="ability-card">
          <div class="card-art">
            <img v-if="ABILITY_ART[card.art]" :src="ABILITY_ART[card.art]" alt="" />
          </div>
          <div class="card-text">
            <input v-model="card.title" class="card-title" placeholder="Ability name" aria-label="Card title" />
            <textarea
              v-model="card.flavor"
              class="card-flavor"
              placeholder="Flavor text…"
              aria-label="Card flavor text"
            ></textarea>
            <textarea
              v-model="card.description"
              class="card-description"
              placeholder="What the ability does…"
              aria-label="Card description"
            ></textarea>
          </div>
        </div>
        <div class="card-tools">
          <label class="tool-field">
            <span>Art</span>
            <select v-model="card.art" aria-label="Card art">
              <option v-for="key in ART_KEYS" :key="key" :value="key">{{ artLabel(key) }}</option>
            </select>
          </label>
          <button class="delete-btn" title="Delete card" @click="onDelete(card.id, card.title)">
            <i class="pi pi-trash"></i> Delete
          </button>
        </div>
      </div>

      <p v-if="abilityCards.length === 0" class="empty">
        No cards yet. Click <strong>New card</strong> to make one.
      </p>
    </div>
  </div>
</template>

<style scoped>
.cards-page {
  min-height: 100vh;
  background: #0d1119;
}
.cards-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-bottom: 1px solid #232b3e;
  background: #131826;
}
.topbar-center h1 {
  margin: 0;
  font-size: 1.05rem;
}
.topbar-center .hint {
  color: #6b7791;
  font-size: 0.8rem;
}
.topbar-right {
  display: flex;
  gap: 10px;
}
.bar-btn {
  padding: 7px 12px;
  border: 1px solid #3b4763;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
}
.bar-btn:hover {
  background: #242e45;
}
.bar-btn.primary {
  background: #5a48c7;
  border-color: #8b7cf6;
  font-weight: 600;
}
.bar-btn.primary:hover {
  background: #6c5ae0;
}

.cards-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px 18px 60px;
}
.card-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

/* The card itself is laid out in physical inches (5in x 3in) so what you see
   on screen is exactly what prints. */
.ability-card {
  width: 5in;
  height: 3in;
  flex-shrink: 0;
  display: flex;
  gap: 0.12in;
  padding: 0.12in;
  background: #fffdf5;
  color: #1a1a1a;
  border: 1px solid #b9b2a0;
  border-radius: 0.08in;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.card-art {
  width: 2.1in;
  height: 100%;
  flex-shrink: 0;
  border: 1px solid #b9b2a0;
  border-radius: 0.06in;
  overflow: hidden;
  background: #eee8d8;
}
.card-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.06in;
}
.ability-card input,
.ability-card textarea {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  font-family: Georgia, 'Times New Roman', serif;
  padding: 0.02in 0.03in;
  border-radius: 3px;
  resize: none;
}
.ability-card input:hover,
.ability-card textarea:hover {
  background: rgba(139, 124, 246, 0.08);
}
.ability-card input:focus,
.ability-card textarea:focus {
  outline: 1px solid #8b7cf6;
  background: #fff;
}
.card-title {
  font-size: 15pt;
  font-weight: 700;
  line-height: 1.15;
}
.card-flavor {
  font-size: 8.5pt;
  font-style: italic;
  color: #55503f;
  line-height: 1.3;
  height: 0.62in;
  border-bottom: 1px solid #cfc8b4 !important;
}
.card-description {
  flex: 1;
  font-size: 9.5pt;
  line-height: 1.35;
}

.card-tools {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 170px;
}
.tool-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tool-field span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b96ad;
}
/* Chevron/arrow styling comes from the global `select` rule in style.css. */
.tool-field select {
  width: 100%;
}
.delete-btn {
  padding: 6px 10px;
  border: 1px solid #3b4763;
  border-radius: 6px;
  background: transparent;
  color: #8b96ad;
  cursor: pointer;
  font-size: 0.8rem;
}
.delete-btn:hover {
  border-color: #c05050;
  color: #f3a0a0;
}
.empty {
  color: #8b96ad;
}

/* Print: only the cards, at true size, with cut borders. */
@media print {
  .cards-page {
    min-height: 0;
    background: #fff;
  }
  .cards-topbar,
  .card-tools,
  .empty {
    display: none;
  }
  .cards-list {
    padding: 0;
    gap: 0.25in;
  }
  .card-row {
    break-inside: avoid;
  }
  .ability-card {
    box-shadow: none;
    border-color: #888;
    border-radius: 0;
  }
  .ability-card input,
  .ability-card textarea {
    background: transparent;
    outline: none;
  }
  .card-flavor {
    overflow: hidden;
  }
  .card-description {
    overflow: hidden;
  }
}
</style>
