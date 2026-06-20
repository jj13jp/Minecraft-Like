import RAPIER from '@dimforge/rapier3d-compat'
import { Renderer } from './renderer/Renderer'
import { Physics } from './physics/Physics'
import { ChunkCollider } from './physics/ChunkCollider'
import { World } from './world/World'
import { Player } from './player/Player'
import { UI } from './ui/UI'

async function main() {
  await RAPIER.init()

  const renderer = new Renderer()
  const physics = new Physics()
  const chunkCollider = new ChunkCollider(physics.world)
  const world = new World(renderer, chunkCollider)

  const player = new Player({
    rapierWorld: physics.world,
    camera: renderer.camera,
    getBlock: (x, y, z) => world.getBlock(x, y, z),
    setBlock: (x, y, z, id) => world.setBlock(x, y, z, id),
  })

  const uiContainer = document.getElementById('ui')!
  const ui = new UI(uiContainer)

  // スタート周辺チャンクを先行生成
  for (let i = 0; i < 10; i++) {
    world.update(player.position.x, player.position.z)
  }

  let fpsAccum = 0
  let fpsCount = 0
  let displayFps = 0

  renderer.start((delta) => {
    physics.step(delta)
    player.update(delta)
    world.update(player.position.x, player.position.z)
    renderer.updateSun(player.position.x, player.position.y, player.position.z)

    fpsAccum += delta
    fpsCount++
    if (fpsAccum >= 0.5) {
      displayFps = fpsCount / fpsAccum
      fpsAccum = 0
      fpsCount = 0
    }

    ui.update(player.position.x, player.position.y, player.position.z, displayFps, player.selectedBlockId)
  })
}

main().catch(console.error)
