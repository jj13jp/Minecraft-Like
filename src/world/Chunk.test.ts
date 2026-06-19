import { describe, it, expect } from 'vitest'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../constants'

describe('Chunk', () => {
  it('初期状態は全て空気', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.getBlock(0, 0, 0)).toBe(0)
    expect(chunk.getBlock(15, 63, 15)).toBe(0)
  })

  it('ブロックのセット・ゲットができる', () => {
    const chunk = new Chunk(0, 0)
    chunk.setBlock(3, 10, 5, 2)
    expect(chunk.getBlock(3, 10, 5)).toBe(2)
  })

  it('範囲外アクセスは0を返す', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.getBlock(-1, 0, 0)).toBe(0)
    expect(chunk.getBlock(0, CHUNK_HEIGHT, 0)).toBe(0)
    expect(chunk.getBlock(CHUNK_WIDTH, 0, 0)).toBe(0)
  })

  it('setBlock後に isDirty が true になる', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.isDirty).toBe(false)
    chunk.setBlock(0, 0, 0, 1)
    expect(chunk.isDirty).toBe(true)
  })

  it('data は Uint8Array でサイズが正しい', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.data).toBeInstanceOf(Uint8Array)
    expect(chunk.data.length).toBe(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH)
  })
})
