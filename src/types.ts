export interface SceneAsset {
  id: string
  name: string
  imageId: string
}

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const ABILITIES: { key: AbilityKey; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
]

export interface SkillDef {
  name: string
  ability: AbilityKey
}

export const SKILLS: SkillDef[] = [
  { name: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', ability: 'int' },
  { name: 'Athletics', ability: 'str' },
  { name: 'Deception', ability: 'cha' },
  { name: 'History', ability: 'int' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Performance', ability: 'cha' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Survival', ability: 'wis' },
]

export interface CharacterSheet {
  class: string
  race: string
  level: number
  maxHp: number
  currentHp: number
  armorClass: number
  speed: number
  abilities: Record<AbilityKey, number>
  /** Names of skills (from SKILLS) the character is proficient in. */
  proficientSkills: string[]
  notes: string
}

export function defaultSheet(): CharacterSheet {
  return {
    class: '',
    race: '',
    level: 1,
    maxHp: 10,
    currentHp: 10,
    armorClass: 10,
    speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficientSkills: [],
    notes: '',
  }
}

/** Which game system's character sheet is shown for a character. */
export type SheetSystem = 'dnd5e' | 'homebrew'

export const SHEET_SYSTEMS: { id: SheetSystem; label: string }[] = [
  { id: 'dnd5e', label: 'D&D 5e' },
  { id: 'homebrew', label: 'Homebrew' },
]

export const HOMEBREW_ABILITIES = [
  "Thoth's Tongue",
  'Eye of Anubis',
  'Steps of Sicarius',
  "Obelisk's Might",
  '???',
] as const

export interface HomebrewSheet {
  occupation: string
  currentHp: number
  maxHp: number
  /** One of HOMEBREW_ABILITIES, or '' when not chosen yet. */
  ability: string
  notes: string
}

export function defaultHomebrewSheet(): HomebrewSheet {
  return {
    occupation: '',
    currentHp: 10,
    maxHp: 10,
    ability: '',
    notes: '',
  }
}

export interface CharacterAsset {
  id: string
  name: string
  imageId: string
  sheetSystem: SheetSystem
  sheet: CharacterSheet
  homebrew: HomebrewSheet
}

export interface CharacterPlacement {
  characterId: string
  /** Horizontal center, fraction of stage width (0..1) */
  x: number
  /** Vertical center, fraction of stage height (0..1) */
  y: number
  /** Token height as a fraction of stage height */
  scale: number
  /** Stays in the scene but is not shown on the player screen. */
  hidden?: boolean
}

export interface ScreenComposition {
  sceneId: string | null
  characters: CharacterPlacement[]
}

export interface MapNodePosition {
  x: number
  y: number
}

export interface MusicTrack {
  id: string
  title: string
  url: string
  notes: string
}

export interface MapEdge {
  a: string
  b: string
}

/** Fully-resolved snapshot sent to the player window (references image blobs only). */
export interface LiveToken {
  imageId: string
  x: number
  y: number
  scale: number
}

export interface LiveView {
  sceneImageId: string | null
  tokens: LiveToken[]
}
