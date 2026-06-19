import RAPIER from '@dimforge/rapier3d-compat'
import { GRAVITY } from '../constants'

export class Physics {
  readonly world: RAPIER.World

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 })
  }

  step(delta: number): void {
    this.world.timestep = delta
    this.world.step()
  }
}
