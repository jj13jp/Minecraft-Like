import { getBlock } from '../blocks/BlockRegistry'

const HOTBAR_BLOCKS = [1, 2, 3, 4, 5]

export class UI {
  private debug: HTMLElement
  private slots: HTMLElement[] = []

  constructor(container: HTMLElement) {
    // 十字線
    const crosshair = document.createElement('div')
    Object.assign(crosshair.style, {
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '20px', height: '20px', pointerEvents: 'none',
    })
    crosshair.innerHTML = `
      <div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.8);margin-top:-1px"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.8);margin-left:-1px"></div>
    `
    container.appendChild(crosshair)

    // ホットバー
    const hotbar = document.createElement('div')
    Object.assign(hotbar.style, {
      position: 'absolute', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', gap: '4px', pointerEvents: 'none',
    })
    HOTBAR_BLOCKS.forEach(blockId => {
      const slot = document.createElement('div')
      Object.assign(slot.style, {
        width: '48px', height: '48px',
        border: '2px solid rgba(255,255,255,0.3)',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '11px', borderRadius: '4px',
      })
      slot.textContent = getBlock(blockId).name
      slot.dataset['blockId'] = String(blockId)
      hotbar.appendChild(slot)
      this.slots.push(slot)
    })
    container.appendChild(hotbar)

    // デバッグ情報
    this.debug = document.createElement('div')
    Object.assign(this.debug.style, {
      position: 'absolute', top: '10px', left: '10px',
      color: '#fff', fontFamily: 'monospace', fontSize: '13px',
      textShadow: '1px 1px 2px #000', pointerEvents: 'none', lineHeight: '1.6',
    })
    container.appendChild(this.debug)
  }

  update(x: number, y: number, z: number, fps: number, selectedId: number): void {
    this.debug.innerHTML =
      `XYZ: ${x.toFixed(1)} / ${y.toFixed(1)} / ${z.toFixed(1)}<br>FPS: ${fps.toFixed(0)}`

    this.slots.forEach((slot, i) => {
      slot.style.border = HOTBAR_BLOCKS[i] === selectedId
        ? '2px solid rgba(255,255,255,1)'
        : '2px solid rgba(255,255,255,0.3)'
    })
  }
}
