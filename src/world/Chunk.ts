import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../constants'

export class Chunk {
  readonly cx: number
  readonly cz: number
  readonly data: Uint8Array
  isDirty = false

  constructor(cx: number, cz: number) {
    this.cx = cx
    this.cz = cz
    this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH)
  }

  private index(lx: number, ly: number, lz: number): number {
    return ly * CHUNK_WIDTH * CHUNK_WIDTH + lz * CHUNK_WIDTH + lx
  }

  isInBounds(lx: number, ly: number, lz: number): boolean {
    return lx >= 0 && lx < CHUNK_WIDTH &&
           ly >= 0 && ly < CHUNK_HEIGHT &&
           lz >= 0 && lz < CHUNK_WIDTH
  }

  getBlock(lx: number, ly: number, lz: number): number {
    if (!this.isInBounds(lx, ly, lz)) return 0
    return this.data[this.index(lx, ly, lz)]
  }

  setBlock(lx: number, ly: number, lz: number, id: number): void {
    if (!this.isInBounds(lx, ly, lz)) return
    this.data[this.index(lx, ly, lz)] = id
    this.isDirty = true
  }
}
