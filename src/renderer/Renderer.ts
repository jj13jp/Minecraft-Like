import * as THREE from 'three'
import { createTextureAtlas } from './TextureAtlas'
import { RENDER_DISTANCE, CHUNK_WIDTH } from '../constants'

const FOG_NEAR = (RENDER_DISTANCE - 1) * CHUNK_WIDTH
const FOG_FAR = (RENDER_DISTANCE + 0.5) * CHUNK_WIDTH

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private material: THREE.MeshLambertMaterial
  private chunkMeshes = new Map<string, THREE.Mesh>()

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, FOG_NEAR, FOG_FAR)

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, FOG_FAR)

    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    document.body.appendChild(this.renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    sunLight.position.set(1, 2, 1)
    this.scene.add(sunLight)

    const atlas = createTextureAtlas()
    this.material = new THREE.MeshLambertMaterial({ map: atlas, side: THREE.FrontSide })

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
