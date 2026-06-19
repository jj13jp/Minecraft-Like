import { createNoise2D } from 'simplex-noise'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_BEDROCK, BLOCK_STONE, BLOCK_DIRT, BLOCK_GRASS, BLOCK_AIR } from '../constants'

const noise2D = createNoise2D()

const BASE_HEIGHT = 32
const AMPLITUDE = 16

function getTerrainHeight(wx: number, wz: number): number {
  const n = noise2D(wx / 64, wz / 64)
  const n2 = noise2D(wx / 24, wz / 24) * 0.3
  return Math.floor(BASE_HEIGHT + (n + n2) * AMPLITUDE)
}

export function generateChunk(cx: number, cz: number): Chunk {
  const chunk = new Chunk(cx, cz)

  for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
    for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
      const wx = cx * CHUNK_WIDTH + lx
      const wz = cz * CHUNK_WIDTH + lz
      const surfaceY = Math.min(getTerrainHeight(wx, wz), CHUNK_HEIGHT - 1)

      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        let blockId = BLOCK_AIR

        if (ly === 0) {
          blockId = BLOCK_BEDROCK
        } else if (ly < surfaceY - 4) {
          blockId = BLOCK_STONE
        } else if (ly < surfaceY) {
          blockId = BLOCK_DIRT
        } else if (ly === surfaceY) {
          blockId = BLOCK_GRASS
        }

        chunk.data[ly * CHUNK_WIDTH * CHUNK_WIDTH + lz * CHUNK_WIDTH + lx] = blockId
      }
    }
  }

  chunk.isDirty = false
  return chunk
}
