import { describe, it, expect } from 'vitest'
import { getBlock, BLOCKS } from './BlockRegistry'

describe('BlockRegistry', () => {
  it('ID 0 は空気（solid=false）', () => {
    const air = getBlock(0)
    expect(air.name).toBe('air')
    expect(air.solid).toBe(false)
  })

  it('ID 1 は岩盤（breakable=false）', () => {
    const bedrock = getBlock(1)
    expect(bedrock.name).toBe('bedrock')
    expect(bedrock.breakable).toBe(false)
  })

  it('ID 4 は草（solid=true）', () => {
    const grass = getBlock(4)
    expect(grass.name).toBe('grass')
    expect(grass.solid).toBe(true)
  })

  it('未知IDはundefinedではなくエラーを投げる', () => {
    expect(() => getBlock(99)).toThrow()
  })

  it('全ブロックが tileTop/tileSide/tileBottom を持つ', () => {
    BLOCKS.forEach(b => {
      expect(b.tileTop).toHaveLength(2)
      expect(b.tileSide).toHaveLength(2)
      expect(b.tileBottom).toHaveLength(2)
    })
  })
})
