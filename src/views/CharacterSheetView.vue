<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { state } from '../store'
import { imageUrls } from '../imageStore'
import {
  ABILITIES,
  HOMEBREW_ABILITIES,
  SHEET_SYSTEMS,
  SKILLS,
  type AbilityKey,
} from '../types'

const route = useRoute()
const router = useRouter()

const character = computed(
  () => state.characters.find((c) => c.id === route.params.id) ?? null,
)

function mod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

const proficiencyBonus = computed(() =>
  character.value ? 2 + Math.floor((character.value.sheet.level - 1) / 4) : 2,
)

function abilityMod(key: AbilityKey): number {
  return character.value ? mod(character.value.sheet.abilities[key]) : 0
}

function isProficient(skill: string): boolean {
  return character.value?.sheet.proficientSkills.includes(skill) ?? false
}

function toggleSkill(skill: string): void {
  if (!character.value) return
  const list = character.value.sheet.proficientSkills
  const idx = list.indexOf(skill)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(skill)
}

function skillBonus(skill: string, ability: AbilityKey): number {
  return abilityMod(ability) + (isProficient(skill) ? proficiencyBonus.value : 0)
}

function goBack(): void {
  router.push('/')
}

function printSheet(): void {
  window.print()
}
</script>

<template>
  <div class="sheet-page">
    <header class="sheet-topbar">
      <button class="back-btn" @click="goBack">
        <i class="pi pi-arrow-left"></i> Back to campaign
      </button>
      <div class="topbar-right">
        <button v-if="character" class="print-btn" @click="printSheet">
          <i class="pi pi-print"></i> Print
        </button>
        <div class="brand">Dungeon Wright</div>
      </div>
    </header>

    <div v-if="!character" class="missing">
      <p>This character no longer exists.</p>
    </div>

    <div v-else class="sheet">
      <!-- Sheet system -->
      <section class="system-row">
        <label class="field system-field">
          <span>Sheet type</span>
          <select v-model="character.sheetSystem" aria-label="Sheet type">
            <option v-for="s in SHEET_SYSTEMS" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
      </section>

      <!-- Identity -->
      <section class="identity">
        <img
          v-if="imageUrls[character.imageId]"
          :src="imageUrls[character.imageId]"
          alt=""
          class="portrait"
        />
        <div class="identity-fields">
          <label class="field name-field">
            <span>Name</span>
            <input v-model="character.name" class="name-input" />
          </label>
          <div v-if="character.sheetSystem === 'dnd5e'" class="identity-row">
            <label class="field">
              <span>Race</span>
              <input v-model="character.sheet.race" placeholder="e.g. Half-Elf" />
            </label>
            <label class="field">
              <span>Class</span>
              <input v-model="character.sheet.class" placeholder="e.g. Ranger" />
            </label>
            <label class="field small">
              <span>Level</span>
              <input v-model.number="character.sheet.level" type="number" min="1" max="20" />
            </label>
            <div class="field small readonly">
              <span>Prof. bonus</span>
              <div class="derived">{{ fmt(proficiencyBonus) }}</div>
            </div>
          </div>
          <div v-else class="identity-row">
            <label class="field">
              <span>Occupation</span>
              <input v-model="character.homebrew.occupation" placeholder="e.g. Tomb Raider" />
            </label>
          </div>
        </div>
      </section>

      <template v-if="character.sheetSystem === 'dnd5e'">
        <!-- Combat stats -->
        <section class="block">
          <h2>Combat</h2>
          <div class="combat-row">
            <label class="field small">
              <span>Current HP</span>
              <input v-model.number="character.sheet.currentHp" type="number" min="0" />
            </label>
            <label class="field small">
              <span>Max HP</span>
              <input v-model.number="character.sheet.maxHp" type="number" min="1" />
            </label>
            <label class="field small">
              <span>Armor Class</span>
              <input v-model.number="character.sheet.armorClass" type="number" min="0" />
            </label>
            <label class="field small">
              <span>Speed (ft)</span>
              <input v-model.number="character.sheet.speed" type="number" min="0" step="5" />
            </label>
            <div class="field small readonly">
              <span>Initiative</span>
              <div class="derived">{{ fmt(abilityMod('dex')) }}</div>
            </div>
          </div>
        </section>

        <!-- Abilities -->
        <section class="block">
          <h2>Ability scores</h2>
          <div class="abilities">
            <div v-for="a in ABILITIES" :key="a.key" class="ability">
              <span class="ability-label">{{ a.label }}</span>
              <input
                v-model.number="character.sheet.abilities[a.key]"
                type="number"
                min="1"
                max="30"
                :aria-label="`${a.label} score`"
              />
              <span class="ability-mod">{{ fmt(abilityMod(a.key)) }}</span>
            </div>
          </div>
        </section>

        <!-- Skills -->
        <section class="block">
          <h2>Skills <span class="block-hint">check a skill to add proficiency</span></h2>
          <div class="skills">
            <label v-for="s in SKILLS" :key="s.name" class="skill">
              <input
                type="checkbox"
                :checked="isProficient(s.name)"
                @change="toggleSkill(s.name)"
              />
              <span class="skill-bonus">{{ fmt(skillBonus(s.name, s.ability)) }}</span>
              <span class="skill-name">{{ s.name }}</span>
              <span class="skill-ability">{{ s.ability.toUpperCase() }}</span>
            </label>
          </div>
        </section>

        <!-- Notes -->
        <section class="block">
          <h2>Notes</h2>
          <textarea
            v-model="character.sheet.notes"
            placeholder="Features, traits, equipment, backstory…"
            rows="5"
          ></textarea>
        </section>
      </template>

      <template v-else>
        <!-- Hit points -->
        <section class="block">
          <h2>Hit points</h2>
          <div class="combat-row">
            <label class="field small">
              <span>Current HP</span>
              <input v-model.number="character.homebrew.currentHp" type="number" min="0" />
            </label>
            <label class="field small">
              <span>Max HP</span>
              <input v-model.number="character.homebrew.maxHp" type="number" min="1" />
            </label>
          </div>
        </section>

        <!-- Abilities -->
        <section class="block">
          <h2>Abilities</h2>
          <label class="field homebrew-ability">
            <span>Ability</span>
            <select v-model="character.homebrew.ability" aria-label="Ability">
              <option value="" disabled>Select an ability…</option>
              <option v-for="a in HOMEBREW_ABILITIES" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
        </section>

        <!-- Notes -->
        <section class="block">
          <h2>Notes</h2>
          <textarea
            v-model="character.homebrew.notes"
            placeholder="Quirks, gear, backstory, how they got that ability…"
            rows="5"
          ></textarea>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sheet-page {
  min-height: 100vh;
  background: #0d1119;
}
.sheet-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid #232b3e;
  background: #131826;
}
.back-btn {
  padding: 7px 12px;
  border: 1px solid #3b4763;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
}
.back-btn:hover {
  background: #242e45;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.print-btn {
  padding: 7px 12px;
  border: 1px solid #3b4763;
  background: #1a2030;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
}
.print-btn:hover {
  background: #242e45;
}
.brand {
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #a99df8;
}
.missing {
  padding: 40px;
  text-align: center;
  color: #8b96ad;
}

.sheet {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 18px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.identity {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.portrait {
  width: 110px;
  height: 110px;
  object-fit: contain;
  background: #0b0e14;
  border: 2px solid #2a3348;
  border-radius: 10px;
  flex-shrink: 0;
}
.identity-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.identity-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.field.small {
  flex: 0 0 auto;
  width: 96px;
}
.field span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b96ad;
}
.field input,
textarea {
  background: #131722;
  border: 1px solid #2a3348;
  border-radius: 6px;
  color: #e2e8f0;
  padding: 7px 9px;
  font-family: inherit;
  font-size: 0.9rem;
}
.field input:focus,
textarea:focus {
  outline: none;
  border-color: #8b7cf6;
}
/* Chevron/arrow styling comes from the global `select` rule in style.css;
   only match the vertical padding / font-size of sibling inputs here. */
.field select {
  padding-top: 7px;
  padding-bottom: 7px;
  font-size: 0.9rem;
}

.system-row {
  display: flex;
  justify-content: flex-end;
}
.system-field {
  flex: 0 0 auto;
  width: 160px;
}
.homebrew-ability {
  max-width: 280px;
}
.name-input {
  font-size: 1.15rem;
  font-weight: 700;
}
.field.readonly .derived {
  padding: 7px 9px;
  border: 1px dashed #2a3348;
  border-radius: 6px;
  color: #a99df8;
  font-weight: 600;
  font-size: 0.9rem;
}

.block {
  border: 1px solid #232b3e;
  border-radius: 10px;
  background: #10141f;
  padding: 14px 16px;
}
.block h2 {
  margin: 0 0 12px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b96ad;
}
.block-hint {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
  color: #6b7791;
  margin-left: 8px;
}
.combat-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.abilities {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}
.ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1px solid #2a3348;
  border-radius: 8px;
  background: #131722;
  padding: 10px 6px;
}
.ability-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: #8b96ad;
}
.ability input {
  width: 56px;
  text-align: center;
  background: #0d1119;
  border: 1px solid #2a3348;
  border-radius: 6px;
  color: #e2e8f0;
  padding: 5px 4px;
  font-size: 1rem;
  font-weight: 600;
}
.ability input:focus {
  outline: none;
  border-color: #8b7cf6;
}
.ability-mod {
  font-size: 0.95rem;
  font-weight: 700;
  color: #a99df8;
}

.skills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}
.skill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.88rem;
}
.skill:hover {
  background: #1a2030;
}
.skill input {
  accent-color: #8b7cf6;
  cursor: pointer;
}
.skill-bonus {
  width: 28px;
  text-align: right;
  font-weight: 600;
  color: #a99df8;
}
.skill-name {
  flex: 1;
}
.skill-ability {
  font-size: 0.7rem;
  color: #6b7791;
}

textarea {
  width: 100%;
  resize: vertical;
  line-height: 1.5;
}

@media (max-width: 700px) {
  .abilities {
    grid-template-columns: repeat(3, 1fr);
  }
  .skills {
    grid-template-columns: 1fr;
  }
}

/* Print: hide chrome and swap the dark theme for ink-friendly colors */
@media print {
  .sheet-topbar {
    display: none;
  }
  .sheet-page {
    min-height: 0;
    background: #fff;
  }
  .sheet {
    max-width: none;
    padding: 0;
    gap: 12px;
    color: #111;
  }
  .portrait {
    background: #fff;
    border-color: #999;
  }
  .field span,
  .block h2,
  .ability-label,
  .skill-ability,
  .block-hint {
    color: #555;
  }
  .field input,
  .field select,
  textarea,
  .ability input {
    background: #fff;
    border-color: #999;
    color: #111;
  }
  .field.readonly .derived,
  .ability-mod,
  .skill-bonus {
    color: #111;
  }
  .field.readonly .derived {
    border-color: #999;
  }
  .block,
  .ability {
    background: #fff;
    border-color: #999;
    break-inside: avoid;
  }
  .skill {
    break-inside: avoid;
  }
  textarea {
    resize: none;
  }
}
</style>
