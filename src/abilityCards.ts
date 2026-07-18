import { reactive, watch } from 'vue'

/**
 * Printable 5in x 3in flashcards for the homebrew abilities.
 * Art lives in src/assets/abilities so it ships with the repo; card text is
 * edited in the app and persisted to localStorage (and included in backups).
 */
export interface AbilityCard {
  id: string
  title: string
  flavor: string
  description: string
  /** Key into ABILITY_ART: the art file's basename without extension. */
  art: string
}

// Every PNG dropped into src/assets/abilities automatically becomes selectable art.
const artModules = import.meta.glob('./assets/abilities/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const ABILITY_ART: Record<string, string> = {}
for (const [path, url] of Object.entries(artModules)) {
  const key = path.split('/').pop()!.replace(/\.png$/, '')
  ABILITY_ART[key] = url
}

export const ART_KEYS = Object.keys(ABILITY_ART).sort()

export function artLabel(key: string): string {
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const CARDS_KEY = 'dw:abilityCards:v1'

function defaultCards(): AbilityCard[] {
  const seed = (title: string, art: string): AbilityCard => ({
    id: crypto.randomUUID(),
    title,
    art,
    flavor: 'A short evocative quote or legend.',
    description: 'What the ability does: effect, cost, and limits.',
  })
  return [
    seed("Thoth's Tongue", 'tongue-of-thoth'),
    seed('Eye of Anubis', 'eye-of-anubis'),
    seed('Steps of Sicarius', 'steps-of-sicarius'),
    seed("Obelisk's Might", 'obelisks-might'),
    seed('???', 'unknown'),
  ]
}

function loadCards(): AbilityCard[] {
  const raw = localStorage.getItem(CARDS_KEY)
  if (raw) {
    try {
      const list = JSON.parse(raw) as AbilityCard[]
      if (Array.isArray(list)) return list
    } catch {
      /* corrupted, reseed */
    }
  }
  return defaultCards()
}

export const abilityCards = reactive<AbilityCard[]>(loadCards())

watch(
  abilityCards,
  () => localStorage.setItem(CARDS_KEY, JSON.stringify(abilityCards)),
  { deep: true, immediate: true },
)

export function addAbilityCard(): AbilityCard {
  const card: AbilityCard = {
    id: crypto.randomUUID(),
    title: 'New ability',
    flavor: 'A short evocative quote or legend.',
    description: 'What the ability does: effect, cost, and limits.',
    art: ABILITY_ART['unknown'] ? 'unknown' : (ART_KEYS[0] ?? ''),
  }
  abilityCards.push(card)
  return card
}

export function deleteAbilityCard(id: string): void {
  const idx = abilityCards.findIndex((c) => c.id === id)
  if (idx >= 0) abilityCards.splice(idx, 1)
}

/** Used by the file-backup feature so card text travels with backups. */
export function restoreAbilityCards(cards: AbilityCard[]): void {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
}
