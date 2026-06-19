import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { CHUNK_WIDTH } from '../constants'

export class ChunkCollider {
  private rapierWorld: RAPIER.World
  private bodies = new Map<string, RAPIER.RigidBody>()

  constructor(rapierWorld: RAPIER.World) {
    this.rapierWorld = rapierWorld
  }

  add(cx: number, cz: number, geometry: THREE.BufferGeometry): void {
    this.remove(cx, cz)

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const indexAttr = geometry.getIndex()
    if (!indexAttr || posAttr.count === 0) return

    const vertices = new Float32Array(posAttr.array)
    const indices = new Uint32Array(indexAttr.array)

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(cx * CHUNK_WIDTH, 0, cz * CHUNK_WIDTH)
    const body = this.rapierWorld.createRigidBody(bodyDesc)
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
    this.rapierWorld.createCollider(colliderDesc, body)

    this.bodies.set(`${cx},${cz}`, body)
  }

  remove(cx: number, cz: number): void {
    const key = `${cx},${cz}`
    const body = this.bodies.get(key)
    if (body) {
      this.rapierWorld.removeRigidBody(body)
      this.bodies.delete(key)
    }
  }
}
