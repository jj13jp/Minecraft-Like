export const CHUNK_WIDTH = 16
export const CHUNK_HEIGHT = 64
export const RENDER_DISTANCE = 3
export const BLOCK_SIZE = 1

export const BLOCK_AIR = 0
export const BLOCK_BEDROCK = 1
export const BLOCK_STONE = 2
export const BLOCK_DIRT = 3
export const BLOCK_GRASS = 4
export const BLOCK_WOOD = 5

export const PLAYER_HEIGHT = 1.8
export const PLAYER_RADIUS = 0.3
export const PLAYER_SPEED = 5
export const JUMP_FORCE = 8
export const GRAVITY = -20
export const REACH_DISTANCE = 5

// 頂点AO: 遮蔽レベル(0..3) → 明度倍率。index 0=遮蔽なし(最も明るい)
export const AO_LEVELS = [1.0, 0.75, 0.55, 0.4]
