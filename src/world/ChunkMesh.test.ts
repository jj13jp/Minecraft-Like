import { describe, it, expect } from 'vitest'
import { Chunk } from './Chunk'
import { buildChunkGeometry } from './ChunkMesh'
import { BLOCK_STONE, BLOCK_AIR } from '../constants'

describe('buildChunkGeometry', () => {
  it('単一ブロックの全面の法線が外向き（FrontSideで描画される巻き順）', () => {
    // チャンク中央に1ブロック置き、周囲は空気
    const chunk = new Chunk(0, 0)
    chunk.setBlock(8, 10, 8, BLOCK_STONE)

    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    geo.computeVertexNormals()

    const pos = geo.getAttribute('position')
    const nrm = geo.getAttribute('normal')

    // ブロックは [8,9]×[10,11]×[8,9]、中心は (8.5,10.5,8.5)
    const center = [8.5, 10.5, 8.5]

    expect(pos.count).toBe(24) // 6面 × 4頂点

    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i)
      const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i)
      // 法線が「中心→頂点」方向と同じ側を向いていれば外向き
      const dot =
        nx * (px - center[0]) +
        ny * (py - center[1]) +
        nz * (pz - center[2])
      expect(dot).toBeGreaterThan(0)
    }
  })
})
