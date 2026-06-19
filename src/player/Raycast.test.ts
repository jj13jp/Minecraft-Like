import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { raycast } from './Raycast'

describe('raycast (DDA)', () => {
  const getBlock = (x: number, y: number, z: number) => {
    if (x === 5 && y === 0 && z === 0) return 2
    return 0
  }

  it('ブロックに当たった場合ブロック座標を返す', () => {
    const origin = new THREE.Vector3(0, 0, 0)
    const dir = new THREE.Vector3(1, 0, 0)
    const result = raycast(origin, dir, 10, getBlock)
    expect(result).not.toBeNull()
    expect(result!.blockPos).toEqual([5, 0, 0])
  })

  it('当たった面の法線がX-方向', () => {
    const origin = new THREE.Vector3(0, 0, 0)
    const dir = new THREE.Vector3(1, 0, 0)
    const result = raycast(origin, dir, 10, getBlock)
    expect(result!.faceNormal).toEqual([-1, 0, 0])
  })

  it('maxDist以内にブロックがない場合 null を返す', () => {
    const origin = new THREE.Vector3(0, 0, 0)
    const dir = new THREE.Vector3(1, 0, 0)
    const result = raycast(origin, dir, 3, getBlock)
    expect(result).toBeNull()
  })

  it('下方向のレイが床を検出する', () => {
    const getFloor = (x: number, y: number, _z: number) => (y === -1 ? 1 : 0)
    const origin = new THREE.Vector3(0.5, 0.5, 0.5)
    const dir = new THREE.Vector3(0, -1, 0)
    const result = raycast(origin, dir, 5, getFloor)
    expect(result).not.toBeNull()
    expect(result!.blockPos[1]).toBe(-1)
    expect(result!.faceNormal).toEqual([0, 1, 0])
  })
})
