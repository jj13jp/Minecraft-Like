import { describe, it, expect } from 'vitest'
import { generateChunk } from './worldgen'
import { BLOCK_BEDROCK, BLOCK_AIR } from '../constants'

describe('generateChunk', () => {
  it('Y=0 は全て岩盤', () => {
    const chunk = generateChunk(0, 0)
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        expect(chunk.getBlock(x, 0, z)).toBe(BLOCK_BEDROCK)
      }
    }
  })

  it('最高高さより上は全て空気', () => {
    const chunk = generateChunk(0, 0)
    // 高さ = 32 + amplitude(16) = 最大48, Y=55 以上は必ず空気
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        expect(chunk.getBlock(x, 55, z)).toBe(BLOCK_AIR)
      }
    }
  })

  it('異なるチャンク座標で異なる地形が生成される', () => {
    const c1 = generateChunk(0, 0)
    const c2 = generateChunk(100, 100)
    let diffCount = 0
    for (let i = 0; i < c1.data.length; i++) {
      if (c1.data[i] !== c2.data[i]) diffCount++
    }
    expect(diffCount).toBeGreaterThan(0)
  })
})
