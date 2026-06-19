import * as THREE from 'three'

export interface RaycastResult {
  blockPos: [number, number, number]
  faceNormal: [number, number, number]
}

export function raycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDist: number,
  getBlock: (x: number, y: number, z: number) => number
): RaycastResult | null {
  const dir = direction.clone().normalize()

  let x = Math.floor(origin.x)
  let y = Math.floor(origin.y)
  let z = Math.floor(origin.z)

  const stepX = dir.x >= 0 ? 1 : -1
  const stepY = dir.y >= 0 ? 1 : -1
  const stepZ = dir.z >= 0 ? 1 : -1

  const tDeltaX = Math.abs(dir.x) < 1e-10 ? Infinity : Math.abs(1 / dir.x)
  const tDeltaY = Math.abs(dir.y) < 1e-10 ? Infinity : Math.abs(1 / dir.y)
  const tDeltaZ = Math.abs(dir.z) < 1e-10 ? Infinity : Math.abs(1 / dir.z)

  let tMaxX = Math.abs(dir.x) < 1e-10 ? Infinity : (dir.x >= 0 ? (x + 1 - origin.x) : (origin.x - x)) / Math.abs(dir.x)
  let tMaxY = Math.abs(dir.y) < 1e-10 ? Infinity : (dir.y >= 0 ? (y + 1 - origin.y) : (origin.y - y)) / Math.abs(dir.y)
  let tMaxZ = Math.abs(dir.z) < 1e-10 ? Infinity : (dir.z >= 0 ? (z + 1 - origin.z) : (origin.z - z)) / Math.abs(dir.z)

  let t = 0
  let lastFace: [number, number, number] = [0, 0, 0]

  while (t < maxDist) {
    if (getBlock(x, y, z) !== 0) {
      return { blockPos: [x, y, z], faceNormal: lastFace }
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX
      x += stepX
      tMaxX += tDeltaX
      lastFace = [-stepX, 0, 0]
    } else if (tMaxY < tMaxZ) {
      t = tMaxY
      y += stepY
      tMaxY += tDeltaY
      lastFace = [0, -stepY, 0]
    } else {
      t = tMaxZ
      z += stepZ
      tMaxZ += tDeltaZ
      lastFace = [0, 0, -stepZ]
    }
  }

  return null
}
