import { Chunk } from './Chunk'
import { generateChunk } from './worldgen'
import { buildChunkGeometry } from './ChunkMesh'
import { Renderer } from '../renderer/Renderer'
import { ChunkCollider } from '../physics/ChunkCollider'
import { CHUNK_WIDTH, CHUNK_HEIGHT, RENDER_DISTANCE, BLOCK_AIR } from '../constants'

export class World {
  private chunks = new Map<string, Chunk | null>()
  private renderer: Renderer
  private chunkCollider: ChunkCollider
  private generateQueue: [number, number][] = []

  constructor(renderer: Renderer, chunkCollider: ChunkCollider) {
    this.renderer = renderer
    this.chunkCollider = chunkCollider
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`
  }

  getChunk(cx: number, cz: number): Chunk | null {
    return this.chunks.get(this.key(cx, cz)) ?? null
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK_AIR
    const cx = Math.floor(wx / CHUNK_WIDTH)
    const cz = Math.floor(wz / CHUNK_WIDTH)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return BLOCK_AIR
    const lx = ((wx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((wz % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    return chunk.getBlock(lx, wy, lz)
  }

  setBlock(wx: number, wy: number, wz: number, id: number): void {
    const cx = Math.floor(wx / CHUNK_WIDTH)
    const cz = Math.floor(wz / CHUNK_WIDTH)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    const lx = ((wx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((wz % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    chunk.setBlock(lx, wy, lz, id)
    this.rebuildChunk(cx, cz)

    if (lx === 0) this.rebuildChunk(cx - 1, cz)
    if (lx === CHUNK_WIDTH - 1) this.rebuildChunk(cx + 1, cz)
    if (lz === 0) this.rebuildChunk(cx, cz - 1)
    if (lz === CHUNK_WIDTH - 1) this.rebuildChunk(cx, cz + 1)
  }

  private rebuildChunk(cx: number, cz: number): void {
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    const geo = buildChunkGeometry(chunk, (wx, wy, wz) => this.getBlock(wx, wy, wz))
    this.renderer.addChunkMesh(cx, cz, geo)
    this.chunkCollider.add(cx, cz, geo)
  }

  update(playerX: number, playerZ: number): void {
    const pcx = Math.floor(playerX / CHUNK_WIDTH)
    const pcz = Math.floor(playerZ / CHUNK_WIDTH)

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = pcx + dx
        const cz = pcz + dz
        const k = this.key(cx, cz)
        if (!this.chunks.has(k)) {
          this.chunks.set(k, null)
          this.generateQueue.push([cx, cz])
        }
      }
    }

    const next = this.generateQueue.shift()
    if (next) {
      const [cx, cz] = next
      const chunk = generateChunk(cx, cz)
      this.chunks.set(this.key(cx, cz), chunk)
      this.rebuildChunk(cx, cz)
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunk) continue
      const [cxStr, czStr] = key.split(',')
      const cx = parseInt(cxStr), cz = parseInt(czStr)
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
        this.renderer.removeChunkMesh(cx, cz)
        this.chunkCollider.remove(cx, cz)
        this.chunks.delete(key)
      }
    }
  }
}
