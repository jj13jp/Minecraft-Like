interface SettingsConfig {
  getSensitivity: () => number
  setSensitivity: (v: number) => void
  getMouseAcceleration: () => boolean
  setMouseAcceleration: (v: boolean) => void
}

export class Settings {
  private backdrop: HTMLElement
  private sensitivityLabel: HTMLElement
  private sensitivityInput: HTMLInputElement
  private accelInput: HTMLInputElement

  constructor(container: HTMLElement, config: SettingsConfig) {
    // 全画面バックドロップ — クリックをここで止め body に伝えない
    this.backdrop = document.createElement('div')
    Object.assign(this.backdrop.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.5)',
      display: 'none', alignItems: 'center', justifyContent: 'center',
      zIndex: '100',
      pointerEvents: 'auto',  // #ui が pointer-events:none のためオーバーライドが必要
    })
    this.backdrop.addEventListener('click', e => e.stopPropagation())

    const panel = document.createElement('div')
    Object.assign(panel.style, {
      background: 'rgba(20,20,20,0.95)',
      color: '#fff', fontFamily: 'monospace', fontSize: '14px',
      padding: '24px 32px', borderRadius: '8px', lineHeight: '2',
      display: 'flex', flexDirection: 'column', gap: '12px',
      minWidth: '280px',
    })

    const title = document.createElement('div')
    Object.assign(title.style, { fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' })
    title.textContent = 'Settings'

    // sensitivity
    const sensRow = document.createElement('div')
    Object.assign(sensRow.style, { display: 'flex', alignItems: 'center', gap: '10px' })

    const sensLabelText = document.createElement('span')
    sensLabelText.textContent = 'Sensitivity'
    Object.assign(sensLabelText.style, { flex: '0 0 100px' })

    this.sensitivityInput = document.createElement('input')
    this.sensitivityInput.type = 'range'
    this.sensitivityInput.min = '0.1'
    this.sensitivityInput.max = '3.0'
    this.sensitivityInput.step = '0.1'
    this.sensitivityInput.value = String(config.getSensitivity())
    Object.assign(this.sensitivityInput.style, { flex: '1' })

    this.sensitivityLabel = document.createElement('span')
    this.sensitivityLabel.textContent = config.getSensitivity().toFixed(1)
    Object.assign(this.sensitivityLabel.style, { flex: '0 0 30px', textAlign: 'right' })

    this.sensitivityInput.addEventListener('input', () => {
      const v = parseFloat(this.sensitivityInput.value)
      config.setSensitivity(v)
      this.sensitivityLabel.textContent = v.toFixed(1)
    })
    sensRow.appendChild(sensLabelText)
    sensRow.appendChild(this.sensitivityInput)
    sensRow.appendChild(this.sensitivityLabel)

    // mouse acceleration
    const accelRow = document.createElement('div')
    Object.assign(accelRow.style, { display: 'flex', alignItems: 'center', gap: '10px' })

    const accelLabel = document.createElement('label')
    Object.assign(accelLabel.style, { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' })

    this.accelInput = document.createElement('input')
    this.accelInput.type = 'checkbox'
    this.accelInput.checked = config.getMouseAcceleration()
    Object.assign(this.accelInput.style, { width: '16px', height: '16px', cursor: 'pointer' })

    this.accelInput.addEventListener('change', () => {
      config.setMouseAcceleration(this.accelInput.checked)
    })

    const accelLabelText = document.createElement('span')
    accelLabelText.textContent = 'Mouse Acceleration'

    accelLabel.appendChild(this.accelInput)
    accelLabel.appendChild(accelLabelText)
    accelRow.appendChild(accelLabel)

    const hint = document.createElement('div')
    Object.assign(hint.style, { fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' })
    hint.textContent = 'Press Esc to resume'

    panel.appendChild(title)
    panel.appendChild(sensRow)
    panel.appendChild(accelRow)
    panel.appendChild(hint)
    this.backdrop.appendChild(panel)
    container.appendChild(this.backdrop)

    // ポインターロック解除時にパネルを表示
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === document.body
      this.backdrop.style.display = locked ? 'none' : 'flex'
    })

    // Escape でパネルを閉じてゲームに戻る
    // ポインターロックが既に解除済みの状態では Escape は通常キーとして扱われるため競合しない
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.backdrop.style.display !== 'none') {
        this.backdrop.style.display = 'none'
        document.body.requestPointerLock()
      }
    })
  }
}
