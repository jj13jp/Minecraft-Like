import * as THREE from 'three'
import { createTextureAtlas } from './TextureAtlas'
import {
  RENDER_DISTANCE, CHUNK_WIDTH,
  SUN_DIRECTION, SHADOW_MAP_SIZE, SHADOW_CAMERA_EXTENT, SHADOW_BIAS,
} from '../constants'

const FOG_NEAR = (RENDER_DISTANCE - 1) * CHUNK_WIDTH
const FOG_FAR = (RENDER_DISTANCE + 0.5) * CHUNK_WIDTH

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private material: THREE.MeshLambertMaterial
  private chunkMeshes = new Map<string, THREE.Mesh>()
  private sun: THREE.DirectionalLight
  private sunDirection = new THREE.Vector3(...SUN_DIRECTION).normalize()
  private readonly sunDistance = 100

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, FOG_NEAR, FOG_FAR)

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, FOG_FAR)

    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    document.body.appendChild(this.renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    this.sun = new THREE.DirectionalLight(0xffffff, 1.0)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
    this.sun.shadow.bias = SHADOW_BIAS
    const cam = this.sun.shadow.camera
    cam.left = -SHADOW_CAMERA_EXTENT
    cam.right = SHADOW_CAMERA_EXTENT
    cam.top = SHADOW_CAMERA_EXTENT
    cam.bottom = -SHADOW_CAMERA_EXTENT
    cam.near = 0.5
    cam.far = this.sunDistance * 2 + SHADOW_CAMERA_EXTENT
    cam.updateProjectionMatrix() // 錐台を変更したので射影行列を更新
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)

    const atlas = createTextureAtlas()
    this.material = new THREE.MeshLambertMaterial({ map: atlas, side: THREE.FrontSide, vertexColors: true })

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  addChunkMesh(cx: number, cz: number, geometry: THREE.BufferGeometry): void {
    this.removeChunkMesh(cx, cz)
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(cx * CHUNK_WIDTH, 0, cz * CHUNK_WIDTH)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.scene.add(mesh)
    this.chunkMeshes.set(`${cx},${cz}`, mesh)
  }

  removeChunkMesh(cx: number, cz: number): void {
    const key = `${cx},${cz}`
    const mesh = this.chunkMeshes.get(key)
    if (mesh) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      this.chunkMeshes.delete(key)
    }
  }

  // 太陽方向（光の進行方向）を差し替える。将来の昼夜サイクルはこれを毎フレーム変えるだけ。
  setSunDirection(x: number, y: number, z: number): void {
    this.sunDirection.set(x, y, z).normalize()
  }

  // 太陽をプレイヤーに追従させ、シャドウ錐台が常にプレイヤー周辺をカバーするようにする。
  updateSun(px: number, py: number, pz: number): void {
    // 光源はプレイヤーから太陽方向の逆へ sunDistance 離した位置に置く
    this.sun.position.set(
      px - this.sunDirection.x * this.sunDistance,
      py - this.sunDirection.y * this.sunDistance,
      pz - this.sunDirection.z * this.sunDistance,
    )
    this.sun.target.position.set(px, py, pz)
    this.sun.target.updateMatrixWorld()
  }

  start(updateFn: (delta: number) => void): void {
    let lastTime = performance.now()
    const loop = () => {
      requestAnimationFrame(loop)
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now
      updateFn(delta)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }
}
