import * as THREE from 'three'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_AIR, AO_LEVELS } from '../constants'
import { getBlock } from '../blocks/BlockRegistry'

const ATLAS_COLS = 16
const TILE_UV = 1 / ATLAS_COLS

type UVFace = 'top' | 'side' | 'bottom'

// uvCorners: per-corner [uFrac, vFrac] (0 or 1).
// u = u0 + uFrac*TILE_UV, v = vFrac*TILE_UV
// For sides: vFrac = 1 - cy, so top vertex (cy=1) → vFrac=0 → v=0 (green),
//            bottom vertex (cy=0) → vFrac=1 → v=TILE_UV (dirt).
const FACES: {
  dir: [number,number,number]
  uvFace: UVFace
  corners: [number,number,number][]
  uvCorners: [number,number][]
  tangents: [[number,number,number],[number,number,number]]
}[] = [
  { dir: [0, 1, 0], uvFace: 'top',    corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], uvCorners: [[0,0],[1,0],[1,1],[0,1]], tangents: [[1,0,0],[0,0,1]] },
  { dir: [0,-1, 0], uvFace: 'bottom', corners: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], uvCorners: [[0,1],[1,1],[1,0],[0,0]], tangents: [[1,0,0],[0,0,1]] },
  { dir: [1, 0, 0], uvFace: 'side',   corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], uvCorners: [[1,1],[1,0],[0,0],[0,1]], tangents: [[0,1,0],[0,0,1]] },
  { dir: [-1,0, 0], uvFace: 'side',   corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], uvCorners: [[0,1],[0,0],[1,0],[1,1]], tangents: [[0,1,0],[0,0,1]] },
  { dir: [0, 0, 1], uvFace: 'side',   corners: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]], uvCorners: [[1,1],[0,1],[0,0],[1,0]], tangents: [[1,0,0],[0,1,0]] },
  { dir: [0, 0,-1], uvFace: 'side',   corners: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], uvCorners: [[0,1],[1,1],[1,0],[0,0]], tangents: [[1,0,0],[0,1,0]] },
]

function getTileCol(blockId: number, uvFace: UVFace): number {
  const def = getBlock(blockId)
  if (uvFace === 'top')    return def.tileTop[0]
  if (uvFace === 'side')   return def.tileSide[0]
  return def.tileBottom[0]
}

// チャンクローカル座標 (lx,ly,lz) のブロックがソリッドか。範囲外は隣接チャンク参照。
function isSolidAt(
  chunk: Chunk,
  getNeighborBlock: (wx: number, wy: number, wz: number) => number,
  lx: number, ly: number, lz: number,
): boolean {
  const id = chunk.isInBounds(lx, ly, lz)
    ? chunk.getBlock(lx, ly, lz)
    : getNeighborBlock(chunk.cx * CHUNK_WIDTH + lx, ly, chunk.cz * CHUNK_WIDTH + lz)
  return id !== BLOCK_AIR && getBlock(id).solid
}

// 頂点AOの遮蔽レベルを返す（0=遮蔽なし/明, 3=最大遮蔽/暗）。
// 古典的Minecraft規則: 両辺ソリッドなら角に関わらず最大遮蔽。
export function computeVertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 3
  return (side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0)
}

export function buildChunkGeometry(
  chunk: Chunk,
  getNeighborBlock: (wx: number, wy: number, wz: number) => number
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
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

          for (let ci = 0; ci < face.corners.length; ci++) {
            const [cx, cy, cz] = face.corners[ci]
            positions.push(lx + cx, ly + cy, lz + cz)
            const [uFrac, vFrac] = face.uvCorners[ci]
            uvs.push(u0 + uFrac * TILE_UV, vFrac * TILE_UV)

            // AO: 面法線方向に1つ進んだ平面で、この隅に接する2辺ブロックと角ブロックを見る
            const [t1, t2] = face.tangents
            const s1 = (cx * t1[0] + cy * t1[1] + cz * t1[2]) === 1 ? 1 : -1
            const s2 = (cx * t2[0] + cy * t2[1] + cz * t2[2]) === 1 ? 1 : -1
            const bx = lx + dx, by = ly + dy, bz = lz + dz
            const side1 = isSolidAt(chunk, getNeighborBlock, bx + s1 * t1[0], by + s1 * t1[1], bz + s1 * t1[2])
            const side2 = isSolidAt(chunk, getNeighborBlock, bx + s2 * t2[0], by + s2 * t2[1], bz + s2 * t2[2])
            const cornerB = isSolidAt(
              chunk, getNeighborBlock,
              bx + s1 * t1[0] + s2 * t2[0],
              by + s1 * t1[1] + s2 * t2[1],
              bz + s1 * t1[2] + s2 * t2[2],
            )
            const ao = AO_LEVELS[computeVertexAO(side1, side2, cornerB)]
            colors.push(ao, ao, ao)
          }

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
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
