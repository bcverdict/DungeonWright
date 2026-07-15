export interface SceneAsset {
  id: string
  name: string
  imageId: string
}

export interface CharacterAsset {
  id: string
  name: string
  imageId: string
}

export interface CharacterPlacement {
  characterId: string
  /** Horizontal center, fraction of stage width (0..1) */
  x: number
  /** Vertical center, fraction of stage height (0..1) */
  y: number
  /** Token height as a fraction of stage height */
  scale: number
}

export interface ScreenComposition {
  sceneId: string | null
  characters: CharacterPlacement[]
}

export interface MapNodePosition {
  x: number
  y: number
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
