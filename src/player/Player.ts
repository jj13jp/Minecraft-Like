import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { raycast } from './Raycast'
import {
  PLAYER_HEIGHT, PLAYER_RADIUS, PLAYER_SPEED, JUMP_FORCE, REACH_DISTANCE,
  BLOCK_AIR, GRAVITY
} from '../constants'

interface PlayerOptions {
  rapierWorld: RAPIER.World
  camera: THREE.PerspectiveCamera
  getBlock: (x: number, y: number, z: number) => number
  setBlock: (x: number, y: number, z: number, id: number) => void
}

export class Player {
  readonly position: THREE.Vector3
  selectedBlockId = 5

  private camera: THREE.PerspectiveCamera
  private getBlock: (x: number, y: number, z: number) => number
  private setBlock: (x: number, y: number, z: number, id: number) => void
  private controller: RAPIER.KinematicCharacterController
  private body: RAPIER.RigidBody
  private collider: RAPIER.Collider

  private yaw = 0
  private pitch = 0
  private velocityY = 0
  private isOnGround = false
  private keys: Record<string, boolean> = {}

  constructor(opts: PlayerOptions) {
    this.camera = opts.camera
    this.getBlock = opts.getBlock
    this.setBlock = opts.setBlock

    this.position = new THREE.Vector3(8, 50, 8)

    this.controller = opts.rapierWorld.createCharacterController(0.01)
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4)
    this.controller.setMinSlopeSlideAngle(Math.PI / 4)
    this.controller.enableAutostep(0.5, 0.2, true)
    this.controller.enableSnapToGround(0.1)
    this.controller.setSlideEnabled(true)

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(this.position.x, this.position.y, this.position.z)
    this.body = opts.rapierWorld.createRigidBody(bodyDesc)
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      (PLAYER_HEIGHT - PLAYER_RADIUS * 2) / 2,
      PLAYER_RADIUS
    )
    this.collider = opts.rapierWorld.createCollider(colliderDesc, this.body)

    this.setupInput()
  }

  private setupInput(): void {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true
      const num = parseInt(e.key)
      if (num >= 1 && num <= 5) this.selectedBlockId = num
    })
    window.addEventListener('keyup', e => { this.keys[e.code] = false })

    document.body.addEventListener('click', () => {
      document.body.requestPointerLock()
    })

    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== document.body) return
      this.yaw -= e.movementX * 0.002
      this.pitch -= e.movementY * 0.002
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch))
    })

    window.addEventListener('mousedown', e => {
      if (document.pointerLockElement !== document.body) return
      const dir = new THREE.Vector3()
      this.camera.getWorldDirection(dir)
      const result = raycast(this.camera.position, dir, REACH_DISTANCE, this.getBlock)
      if (!result) return

      if (e.button === 0) {
        const [bx, by, bz] = result.blockPos
        this.setBlock(bx, by, bz, BLOCK_AIR)
      } else if (e.button === 2) {
        const [bx, by, bz] = result.blockPos
        const [nx, ny, nz] = result.faceNormal
        this.setBlock(bx + nx, by + ny, bz + nz, this.selectedBlockId)
      }
    })

    window.addEventListener('contextmenu', e => e.preventDefault())
  }

  update(delta: number): void {
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
    this.camera.quaternion.setFromEuler(euler)

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    let moveX = 0, moveZ = 0
    if (this.keys['KeyW']) { moveX += forward.x; moveZ += forward.z }
    if (this.keys['KeyS']) { moveX -= forward.x; moveZ -= forward.z }
    if (this.keys['KeyA']) { moveX -= right.x; moveZ -= right.z }
    if (this.keys['KeyD']) { moveX += right.x; moveZ += right.z }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (len > 0) { moveX = (moveX / len) * PLAYER_SPEED; moveZ = (moveZ / len) * PLAYER_SPEED }

    if (this.keys['Space'] && this.isOnGround) {
      this.velocityY = JUMP_FORCE
    }
    this.velocityY += GRAVITY * delta

    this.controller.computeColliderMovement(this.collider, {
      x: moveX * delta,
      y: this.velocityY * delta,
      z: moveZ * delta,
    })
    const corrected = this.controller.computedMovement()

    const pos = this.body.translation()
    this.body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    })

    this.isOnGround = this.controller.computedGrounded()
    if (this.isOnGround && this.velocityY < 0) this.velocityY = 0

    const newPos = this.body.translation()
    this.position.set(newPos.x, newPos.y, newPos.z)
    this.camera.position.set(newPos.x, newPos.y + PLAYER_HEIGHT - 0.2, newPos.z)
  }
}
