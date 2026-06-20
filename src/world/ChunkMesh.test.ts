import { describe, it, expect } from 'vitest'
import { Chunk } from './Chunk'
import { buildChunkGeometry, computeVertexAO } from './ChunkMesh'
import { BLOCK_STONE, BLOCK_AIR, BLOCK_GRASS } from '../constants'

const ATLAS_COLS = 16
const TILE_UV = 1 / ATLAS_COLS

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

  it('grass側面UVは頂点高さに対応する（上端=緑v≈0、下端=土v≈TILE_UV）', () => {
    // BLOCK_GRASS を (0,0,0) に置き、周囲は全て空気
    const chunk = new Chunk(0, 0)
    chunk.setBlock(0, 0, 0, BLOCK_GRASS)

    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    geo.computeVertexNormals()

    const pos = geo.getAttribute('position')
    const uvAttr = geo.getAttribute('uv')
    const nrm = geo.getAttribute('normal')

    // grass tileSide は col=4 なので u ∈ [4*TILE_UV, 5*TILE_UV]
    const uMin = 4 * TILE_UV
    const uMax = 5 * TILE_UV
    const blockBottom = 0
    const blockTop = 1

    let sideFaceChecked = false

    for (let i = 0; i < pos.count; i++) {
      const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i)
      // 側面: 水平法線 (ny ≈ 0, nx or nz ≠ 0)
      if (Math.abs(ny) > 0.5) continue

      const py = pos.getY(i)
      const u = uvAttr.getX(i)
      const v = uvAttr.getY(i)

      // u は grass side タイル列の範囲内
      expect(u).toBeGreaterThanOrEqual(uMin - 1e-6)
      expect(u).toBeLessThanOrEqual(uMax + 1e-6)

      if (Math.abs(py - blockTop) < 1e-6) {
        // 上端頂点: v ≈ 0（緑）
        expect(v).toBeLessThan(TILE_UV / 2)
        sideFaceChecked = true
      } else if (Math.abs(py - blockBottom) < 1e-6) {
        // 下端頂点: v ≈ TILE_UV（土）
        expect(v).toBeGreaterThan(TILE_UV / 2)
        sideFaceChecked = true
      }

      // ny は実質 0（側面）
      expect(Math.abs(nx) + Math.abs(nz)).toBeGreaterThan(0.5)
    }

    expect(sideFaceChecked).toBe(true)
  })

  it('単一ブロックは全頂点が遮蔽なし（color=1.0）', () => {
    const chunk = new Chunk(0, 0)
    chunk.setBlock(8, 10, 8, BLOCK_STONE)
    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    const color = geo.getAttribute('color')
    expect(color).toBeTruthy()
    expect(color.count).toBe(geo.getAttribute('position').count)
    for (let i = 0; i < color.count; i++) {
      expect(color.getX(i)).toBeCloseTo(1.0)
    }
  })

  it('床の上のブロックはAO遮蔽で一部 color<1.0 になる', () => {
    const chunk = new Chunk(0, 0)
    for (let x = 6; x <= 10; x++) chunk.setBlock(x, 10, 8, BLOCK_STONE) // 床
    chunk.setBlock(8, 11, 8, BLOCK_STONE)                              // 床の上のブロック
    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    const color = geo.getAttribute('color')
    let hasDark = false
    for (let i = 0; i < color.count; i++) {
      if (color.getX(i) < 0.999) hasDark = true
    }
    expect(hasDark).toBe(true)
  })
})

describe('computeVertexAO', () => {
  it('両辺ソリッドは最大遮蔽3（角は無関係）', () => {
    expect(computeVertexAO(true, true, false)).toBe(3)
    expect(computeVertexAO(true, true, true)).toBe(3)
  })
  it('遮蔽なしは0', () => {
    expect(computeVertexAO(false, false, false)).toBe(0)
  })
  it('片辺のみは1', () => {
    expect(computeVertexAO(true, false, false)).toBe(1)
    expect(computeVertexAO(false, true, false)).toBe(1)
  })
  it('角のみは1', () => {
    expect(computeVertexAO(false, false, true)).toBe(1)
  })
  it('片辺+角は2', () => {
    expect(computeVertexAO(true, false, true)).toBe(2)
  })
})
