import * as THREE from 'three'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_AIR } from '../constants'
import { getBlock } from '../blocks/BlockRegistry'

const ATLAS_COLS = 16
const TILE_UV = 1 / ATLAS_COLS

type UVFace = 'top' | 'side' | 'bottom'

const FACES: { dir: [number,number,number]; uvFace: UVFace; corners: [number,number,number][] }[] = [
  { dir: [0, 1, 0], uvFace: 'top',    corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]] },
  { dir: [0,-1, 0], uvFace: 'bottom', corners: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]] },
  { dir: [1, 0, 0], uvFace: 'side',   corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]] },
  { dir: [-1,0, 0], uvFace: 'side',   corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]] },
  { dir: [0, 0, 1], uvFace: 'side',   corners: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]] },
  { dir: [0, 0,-1], uvFace: 'side',   corners: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]] },
]

function getTileCol(blockId: number, uvFace: UVFace): number {
  const def = getBlock(blockId)
  if (uvFace === 'top')    return def.tileTop[0]
  if (uvFace === 'side')   return def.tileSide[0]
  return def.tileBottom[0]
}

export function buildChunkGeometry(
  chunk: Chunk,
  getNeighborBlock: (wx: number, wy: number, wz: number) => number
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let vertexCount = 0

  for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
    for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
      for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
        const blockId = chunk.getBlock(lx, ly, lz)
        if (blockId === BLOCK_AIR) continue

        const wx = chunk.cx * CHUNK_WIDTH + lx
        const wz = chunk.cz * CHUNK_WIDTH + lz

        for (const face of FACES) {
          const [dx, dy, dz] = face.dir
          const neighborId = chunk.isInBounds(lx + dx, ly + dy, lz + dz)
            ? chunk.getBlock(lx + dx, ly + dy, lz + dz)
            : getNeighborBlock(wx + dx, ly + dy, wz + dz)

          if (neighborId !== BLOCK_AIR && getBlock(neighborId).solid) continue

          const tileCol = getTileCol(blockId, face.uvFace)
          const u0 = tileCol * TILE_UV
          const u1 = u0 + TILE_UV

          for (const [cx, cy, cz] of face.corners) {
            positions.push(lx + cx, ly + cy, lz + cz)
          }
          uvs.push(u0, TILE_UV, u1, TILE_UV, u1, 0, u0, 0)

          // 巻き順はCCW（外向き法線）にする。FACES の corners は時計回り定義なので
          // 三角形のインデックス順を反転して front face を外側に向ける。
          indices.push(
            vertexCount, vertexCount + 2, vertexCount + 1,
            vertexCount, vertexCount + 3, vertexCount + 2
          )
          vertexCount += 4
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
