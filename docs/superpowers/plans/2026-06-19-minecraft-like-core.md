# Minecraft-Like コアメカニクス 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three.js + Rapier3D でブラウザ動作するMinecraftライクなコアメカニクスプロトタイプを実装する（ブロック配置・破壊・一人称移動・手続き生成ワールド）

**Architecture:** Vite + TypeScript でビルドし、Three.js でチャンクメッシュを描画、Rapier3D (WASM) でキャラクター物理・衝突判定を行う。ワールドはチャンク（16×64×16）単位で管理し、プレイヤー周囲 ±3 チャンクをロード・アンロードする。

**Tech Stack:** Three.js, @dimforge/rapier3d-compat, simplex-noise, Vite, TypeScript, Vitest

## Global Constraints

- Node.js 20 以上
- パッケージマネージャー: pnpm のみ（npm・yarn 不可）
- TypeScript strict モード
- チャンクサイズ: 16×64×16 固定
- ブロックID: 0=空気, 1=岩盤, 2=石, 3=土, 4=草, 5=木材
- レンダー距離: ±3 チャンク（変更可能な定数として定義）
- テスト: Vitest（UI・Three.js・Rapierに依存しないロジックのみ）

---

## ファイルマップ

```
src/
├── main.ts                    # エントリポイント・ゲームループ統合
├── constants.ts               # 定数（チャンクサイズ・レンダー距離等）
├── blocks/
│   └── BlockRegistry.ts       # ブロック種別定義・UV座標マッピング
├── world/
│   ├── Chunk.ts               # ブロックデータ（Uint8Array）・座標ヘルパー
│   ├── worldgen.ts            # Perlinノイズによる地形生成
│   ├── ChunkMesh.ts           # BufferGeometry生成（フェイスカリング）
│   └── World.ts               # チャンク管理・ライフサイクル
├── renderer/
│   ├── Renderer.ts            # Three.js シーン・ライト・ループ
│   └── TextureAtlas.ts        # Canvasベースのプログラマティックテクスチャ生成
├── physics/
│   ├── Physics.ts             # Rapierワールド初期化
│   └── ChunkCollider.ts       # チャンクごとのRapier Trimeshコライダー
├── player/
│   ├── Player.ts              # 入力・カメラ・Rapier KCC
│   └── Raycast.ts             # DDAアルゴリズムによるブロック選択
└── ui/
    └── UI.ts                  # 十字線・ホットバー・デバッグ情報
```

---

## Task 1: プロジェクトセットアップ

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/constants.ts`
- Create: `src/main.ts`（空のシェル）

**Interfaces:**
- Produces: `CHUNK_WIDTH`, `CHUNK_HEIGHT`, `RENDER_DISTANCE` 定数

- [ ] **Step 1: Vite プロジェクトを初期化する**

```bash
cd /home/jj/ws/_game/Minecraft-Like
pnpm create vite . --template vanilla-ts
```

プロンプトで「Ignore files and continue」を選択（既存ファイルがある場合）。

- [ ] **Step 2: 依存パッケージをインストールする**

```bash
pnpm add three @dimforge/rapier3d-compat simplex-noise
pnpm add -D @types/three vitest @vitest/ui
```

- [ ] **Step 3: `vite.config.ts` を書く**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
})
```

Rapier の WASM を Vite の pre-bundle 対象から除外するために必要。

- [ ] **Step 4: `tsconfig.json` を書く**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: `index.html` を書く**

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minecraft-Like</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { overflow: hidden; background: #000; }
      canvas { display: block; }
      #ui { position: fixed; inset: 0; pointer-events: none; }
    </style>
  </head>
  <body>
    <div id="ui"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: `src/constants.ts` を書く**

```typescript
export const CHUNK_WIDTH = 16
export const CHUNK_HEIGHT = 64
export const RENDER_DISTANCE = 3
export const BLOCK_SIZE = 1

export const BLOCK_AIR = 0
export const BLOCK_BEDROCK = 1
export const BLOCK_STONE = 2
export const BLOCK_DIRT = 3
export const BLOCK_GRASS = 4
export const BLOCK_WOOD = 5

export const PLAYER_HEIGHT = 1.8
export const PLAYER_RADIUS = 0.3
export const PLAYER_SPEED = 5
export const JUMP_FORCE = 8
export const GRAVITY = -20
export const REACH_DISTANCE = 5
```

- [ ] **Step 7: `src/main.ts` に空のシェルを書く**

```typescript
async function main() {
  console.log('Minecraft-Like starting...')
}

main()
```

- [ ] **Step 8: 開発サーバーが起動することを確認する**

```bash
pnpm dev
```

Expected: `http://localhost:5173` でページが開き、コンソールに「Minecraft-Like starting...」が表示される。

- [ ] **Step 9: `package.json` に test スクリプトを追加する**

`package.json` の `scripts` に追加:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 10: コミットする**

```bash
git add -A
git commit -m "chore: プロジェクトセットアップ（Vite + Three.js + Rapier + Vitest）"
```

---

## Task 2: BlockRegistry

**Files:**
- Create: `src/blocks/BlockRegistry.ts`
- Test: `src/blocks/BlockRegistry.test.ts`

**Interfaces:**
- Produces:
  - `BlockDef`: `{ id: number; name: string; solid: boolean; breakable: boolean; tileTop: [number,number]; tileSide: [number,number]; tileBottom: [number,number] }`
  - `BLOCKS: BlockDef[]` — インデックスがブロックID
  - `getBlock(id: number): BlockDef`

- [ ] **Step 1: テストを書く**

`src/blocks/BlockRegistry.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getBlock, BLOCKS } from './BlockRegistry'

describe('BlockRegistry', () => {
  it('ID 0 は空気（solid=false）', () => {
    const air = getBlock(0)
    expect(air.name).toBe('air')
    expect(air.solid).toBe(false)
  })

  it('ID 1 は岩盤（breakable=false）', () => {
    const bedrock = getBlock(1)
    expect(bedrock.name).toBe('bedrock')
    expect(bedrock.breakable).toBe(false)
  })

  it('ID 4 は草（solid=true）', () => {
    const grass = getBlock(4)
    expect(grass.name).toBe('grass')
    expect(grass.solid).toBe(true)
  })

  it('未知IDはundefinedではなくエラーを投げる', () => {
    expect(() => getBlock(99)).toThrow()
  })

  it('全ブロックが tileTop/tileSide/tileBottom を持つ', () => {
    BLOCKS.forEach(b => {
      expect(b.tileTop).toHaveLength(2)
      expect(b.tileSide).toHaveLength(2)
      expect(b.tileBottom).toHaveLength(2)
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pnpm test
```

Expected: FAIL（BlockRegistry が存在しない）

- [ ] **Step 3: `src/blocks/BlockRegistry.ts` を書く**

```typescript
export interface BlockDef {
  id: number
  name: string
  solid: boolean
  breakable: boolean
  tileTop: [number, number]     // テクスチャアトラス内のタイル座標 [col, row]
  tileSide: [number, number]
  tileBottom: [number, number]
}

// テクスチャアトラスは16タイル幅。各タイルは16×16px。
// col: 0=bedrock, 1=stone, 2=dirt, 3=grass_top, 4=grass_side, 5=wood
export const BLOCKS: BlockDef[] = [
  { id: 0, name: 'air',     solid: false, breakable: false, tileTop: [0,0], tileSide: [0,0], tileBottom: [0,0] },
  { id: 1, name: 'bedrock', solid: true,  breakable: false, tileTop: [0,0], tileSide: [0,0], tileBottom: [0,0] },
  { id: 2, name: 'stone',   solid: true,  breakable: true,  tileTop: [1,0], tileSide: [1,0], tileBottom: [1,0] },
  { id: 3, name: 'dirt',    solid: true,  breakable: true,  tileTop: [2,0], tileSide: [2,0], tileBottom: [2,0] },
  { id: 4, name: 'grass',   solid: true,  breakable: true,  tileTop: [3,0], tileSide: [4,0], tileBottom: [2,0] },
  { id: 5, name: 'wood',    solid: true,  breakable: true,  tileTop: [5,0], tileSide: [5,0], tileBottom: [5,0] },
]

export function getBlock(id: number): BlockDef {
  const def = BLOCKS[id]
  if (!def) throw new Error(`Unknown block ID: ${id}`)
  return def
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
pnpm test
```

Expected: PASS (5 tests)

- [ ] **Step 5: コミットする**

```bash
git add src/blocks/
git commit -m "feat: BlockRegistry（ブロック種別定義・UVマッピング）"
```

---

## Task 3: Chunk データ構造 + WorldGen

**Files:**
- Create: `src/world/Chunk.ts`
- Create: `src/world/worldgen.ts`
- Test: `src/world/Chunk.test.ts`
- Test: `src/world/worldgen.test.ts`

**Interfaces:**
- Produces:
  - `Chunk`: クラス `{ cx: number; cz: number; data: Uint8Array; getBlock(lx,ly,lz): number; setBlock(lx,ly,lz,id): void; isInBounds(lx,ly,lz): boolean; isDirty: boolean }`
  - `generateChunk(cx: number, cz: number): Chunk`

- [ ] **Step 1: Chunk のテストを書く**

`src/world/Chunk.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../constants'

describe('Chunk', () => {
  it('初期状態は全て空気', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.getBlock(0, 0, 0)).toBe(0)
    expect(chunk.getBlock(15, 63, 15)).toBe(0)
  })

  it('ブロックのセット・ゲットができる', () => {
    const chunk = new Chunk(0, 0)
    chunk.setBlock(3, 10, 5, 2)
    expect(chunk.getBlock(3, 10, 5)).toBe(2)
  })

  it('範囲外アクセスは0を返す', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.getBlock(-1, 0, 0)).toBe(0)
    expect(chunk.getBlock(0, CHUNK_HEIGHT, 0)).toBe(0)
    expect(chunk.getBlock(CHUNK_WIDTH, 0, 0)).toBe(0)
  })

  it('setBlock後に isDirty が true になる', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.isDirty).toBe(false)
    chunk.setBlock(0, 0, 0, 1)
    expect(chunk.isDirty).toBe(true)
  })

  it('data は Uint8Array でサイズが正しい', () => {
    const chunk = new Chunk(0, 0)
    expect(chunk.data).toBeInstanceOf(Uint8Array)
    expect(chunk.data.length).toBe(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH)
  })
})
```

- [ ] **Step 2: worldgen のテストを書く**

`src/world/worldgen.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateChunk } from './worldgen'
import { BLOCK_BEDROCK, BLOCK_AIR } from '../constants'

describe('generateChunk', () => {
  it('Y=0 は全て岩盤', () => {
    const chunk = generateChunk(0, 0)
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        expect(chunk.getBlock(x, 0, z)).toBe(BLOCK_BEDROCK)
      }
    }
  })

  it('最高高さより上は全て空気', () => {
    const chunk = generateChunk(0, 0)
    // 高さ = 32 + amplitude(16) = 最大48, Y=55 以上は必ず空気
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        expect(chunk.getBlock(x, 55, z)).toBe(BLOCK_AIR)
      }
    }
  })

  it('異なるチャンク座標で異なる地形が生成される', () => {
    const c1 = generateChunk(0, 0)
    const c2 = generateChunk(100, 100)
    let diffCount = 0
    for (let i = 0; i < c1.data.length; i++) {
      if (c1.data[i] !== c2.data[i]) diffCount++
    }
    expect(diffCount).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
pnpm test
```

Expected: FAIL

- [ ] **Step 4: `src/world/Chunk.ts` を書く**

```typescript
import { CHUNK_WIDTH, CHUNK_HEIGHT } from '../constants'

export class Chunk {
  readonly cx: number
  readonly cz: number
  readonly data: Uint8Array
  isDirty = false

  constructor(cx: number, cz: number) {
    this.cx = cx
    this.cz = cz
    this.data = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_WIDTH)
  }

  private index(lx: number, ly: number, lz: number): number {
    return ly * CHUNK_WIDTH * CHUNK_WIDTH + lz * CHUNK_WIDTH + lx
  }

  isInBounds(lx: number, ly: number, lz: number): boolean {
    return lx >= 0 && lx < CHUNK_WIDTH &&
           ly >= 0 && ly < CHUNK_HEIGHT &&
           lz >= 0 && lz < CHUNK_WIDTH
  }

  getBlock(lx: number, ly: number, lz: number): number {
    if (!this.isInBounds(lx, ly, lz)) return 0
    return this.data[this.index(lx, ly, lz)]
  }

  setBlock(lx: number, ly: number, lz: number, id: number): void {
    if (!this.isInBounds(lx, ly, lz)) return
    this.data[this.index(lx, ly, lz)] = id
    this.isDirty = true
  }
}
```

- [ ] **Step 5: `src/world/worldgen.ts` を書く**

```typescript
import { createNoise2D } from 'simplex-noise'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_BEDROCK, BLOCK_STONE, BLOCK_DIRT, BLOCK_GRASS, BLOCK_AIR } from '../constants'

const noise2D = createNoise2D()

const BASE_HEIGHT = 32
const AMPLITUDE = 16

function getTerrainHeight(wx: number, wz: number): number {
  const n = noise2D(wx / 64, wz / 64)
  const n2 = noise2D(wx / 24, wz / 24) * 0.3
  return Math.floor(BASE_HEIGHT + (n + n2) * AMPLITUDE)
}

export function generateChunk(cx: number, cz: number): Chunk {
  const chunk = new Chunk(cx, cz)

  for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
    for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
      const wx = cx * CHUNK_WIDTH + lx
      const wz = cz * CHUNK_WIDTH + lz
      const surfaceY = Math.min(getTerrainHeight(wx, wz), CHUNK_HEIGHT - 1)

      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        let blockId = BLOCK_AIR

        if (ly === 0) {
          blockId = BLOCK_BEDROCK
        } else if (ly < surfaceY - 4) {
          blockId = BLOCK_STONE
        } else if (ly < surfaceY) {
          blockId = BLOCK_DIRT
        } else if (ly === surfaceY) {
          blockId = BLOCK_GRASS
        }

        chunk.data[ly * CHUNK_WIDTH * CHUNK_WIDTH + lz * CHUNK_WIDTH + lx] = blockId
      }
    }
  }

  chunk.isDirty = false
  return chunk
}
```

- [ ] **Step 6: テストが通ることを確認する**

```bash
pnpm test
```

Expected: PASS (8 tests)

- [ ] **Step 7: コミットする**

```bash
git add src/world/Chunk.ts src/world/worldgen.ts src/world/Chunk.test.ts src/world/worldgen.test.ts
git commit -m "feat: Chunkデータ構造 + Perlinノイズによる地形生成"
```

---

## Task 4: TextureAtlas + ChunkMesh

**Files:**
- Create: `src/renderer/TextureAtlas.ts`
- Create: `src/world/ChunkMesh.ts`

**Interfaces:**
- Consumes: `Chunk`, `getBlock(id)`
- Produces:
  - `createTextureAtlas(): THREE.Texture`
  - `buildChunkGeometry(chunk: Chunk, getNeighborBlock: (wx:number,wy:number,wz:number)=>number): THREE.BufferGeometry`

- [ ] **Step 1: `src/renderer/TextureAtlas.ts` を書く**

```typescript
import * as THREE from 'three'

const TILE_SIZE = 16
const ATLAS_COLS = 16

const TILE_COLORS: [number, number, number][] = [
  [20, 20, 20],    // col 0: bedrock
  [120, 120, 120], // col 1: stone
  [134, 96, 67],   // col 2: dirt
  [91, 148, 54],   // col 3: grass top
  [91, 148, 54],   // col 4: grass side（後で上書き）
  [181, 152, 100], // col 5: wood
]

function drawGrassSideTile(ctx: CanvasRenderingContext2D, col: number) {
  const x = col * TILE_SIZE
  ctx.fillStyle = 'rgb(91,148,54)'
  ctx.fillRect(x, 0, TILE_SIZE, 4)
  ctx.fillStyle = 'rgb(134,96,67)'
  ctx.fillRect(x, 4, TILE_SIZE, TILE_SIZE - 4)
}

export function createTextureAtlas(): THREE.Texture {
  const size = ATLAS_COLS * TILE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)

  TILE_COLORS.forEach(([r, g, b], col) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(col * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE)
  })
  drawGrassSideTile(ctx, 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}
```

- [ ] **Step 2: `src/world/ChunkMesh.ts` を書く**

```typescript
import * as THREE from 'three'
import { Chunk } from './Chunk'
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_AIR } from '../constants'
import { getBlock } from '../blocks/BlockRegistry'

const ATLAS_COLS = 16
const TILE_UV = 1 / ATLAS_COLS

type UVFace = 'top' | 'side' | 'bottom'

const FACES: { dir: [number,number,number]; uvFace: UVFace; corners: [number,number,number][] }[] = [
  { dir: [0, 1, 0], uvFace: 'top',    corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]] },
  { dir: [0,-1, 0], uvFace: 'bottom', corners: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]] },
  { dir: [1, 0, 0], uvFace: 'side',   corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]] },
  { dir: [-1,0, 0], uvFace: 'side',   corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]] },
  { dir: [0, 0, 1], uvFace: 'side',   corners: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]] },
  { dir: [0, 0,-1], uvFace: 'side',   corners: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]] },
]

function getTileCol(blockId: number, uvFace: UVFace): number {
  const def = getBlock(blockId)
  if (uvFace === 'top')    return def.tileTop[0]
  if (uvFace === 'side')   return def.tileSide[0]
  return def.tileBottom[0]
}

export function buildChunkGeometry(
  chunk: Chunk,
  getNeighborBlock: (wx: number, wy: number, wz: number) => number
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let vertexCount = 0

  for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
    for (let lz = 0; lz < CHUNK_WIDTH; lz++) {
      for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
        const blockId = chunk.getBlock(lx, ly, lz)
        if (blockId === BLOCK_AIR) continue

        const wx = chunk.cx * CHUNK_WIDTH + lx
        const wz = chunk.cz * CHUNK_WIDTH + lz

        for (const face of FACES) {
          const [dx, dy, dz] = face.dir
          const neighborId = chunk.isInBounds(lx + dx, ly + dy, lz + dz)
            ? chunk.getBlock(lx + dx, ly + dy, lz + dz)
            : getNeighborBlock(wx + dx, ly + dy, wz + dz)

          if (neighborId !== BLOCK_AIR && getBlock(neighborId).solid) continue

          const tileCol = getTileCol(blockId, face.uvFace)
          const u0 = tileCol * TILE_UV
          const u1 = u0 + TILE_UV

          for (const [cx, cy, cz] of face.corners) {
            positions.push(lx + cx, ly + cy, lz + cz)
          }
          uvs.push(u0, TILE_UV, u1, TILE_UV, u1, 0, u0, 0)

          indices.push(
            vertexCount, vertexCount + 1, vertexCount + 2,
            vertexCount, vertexCount + 2, vertexCount + 3
          )
          vertexCount += 4
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
```

- [ ] **Step 3: コンパイルエラーがないことを確認する**

```bash
pnpm dev
```

Expected: コンパイルエラーなし

- [ ] **Step 4: コミットする**

```bash
git add src/renderer/TextureAtlas.ts src/world/ChunkMesh.ts
git commit -m "feat: TextureAtlas（Canvas生成）+ ChunkMesh（フェイスカリング）"
```

---

## Task 5: Renderer

**Files:**
- Create: `src/renderer/Renderer.ts`

**Interfaces:**
- Produces:
  - `Renderer`: クラス `{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; addChunkMesh(cx,cz,geo): void; removeChunkMesh(cx,cz): void; start(updateFn: (delta:number)=>void): void }`

- [ ] **Step 1: `src/renderer/Renderer.ts` を書く**

```typescript
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
```

- [ ] **Step 2: コンパイルエラーがないことを確認する**

```bash
pnpm dev
```

Expected: コンパイルエラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/renderer/Renderer.ts
git commit -m "feat: Renderer（Three.js シーン・ライト・フォグ・レンダーループ）"
```

---

## Task 6: Physics + World

**Files:**
- Create: `src/physics/Physics.ts`
- Create: `src/physics/ChunkCollider.ts`
- Create: `src/world/World.ts`

**Interfaces:**
- Consumes: `Chunk`, `generateChunk`, `buildChunkGeometry`, `Renderer`
- Produces:
  - `Physics`: クラス `{ world: RAPIER.World; step(delta: number): void }`
  - `ChunkCollider`: クラス `{ add(cx: number, cz: number, geo: THREE.BufferGeometry): void; remove(cx: number, cz: number): void }`
  - `World`: クラス `{ getBlock(wx,wy,wz): number; setBlock(wx,wy,wz,id): void; update(playerX,playerZ): void }`

- [ ] **Step 1: `src/physics/Physics.ts` を書く**

```typescript
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
```

- [ ] **Step 2: `src/physics/ChunkCollider.ts` を書く**

```typescript
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
```

- [ ] **Step 3: `src/world/World.ts` を書く**

```typescript
import { Chunk } from './Chunk'
import { generateChunk } from './worldgen'
import { buildChunkGeometry } from './ChunkMesh'
import { Renderer } from '../renderer/Renderer'
import { ChunkCollider } from '../physics/ChunkCollider'
import { CHUNK_WIDTH, CHUNK_HEIGHT, RENDER_DISTANCE, BLOCK_AIR } from '../constants'

export class World {
  private chunks = new Map<string, Chunk | null>()
  private renderer: Renderer
  private chunkCollider: ChunkCollider
  private generateQueue: [number, number][] = []

  constructor(renderer: Renderer, chunkCollider: ChunkCollider) {
    this.renderer = renderer
    this.chunkCollider = chunkCollider
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`
  }

  getChunk(cx: number, cz: number): Chunk | null {
    return this.chunks.get(this.key(cx, cz)) ?? null
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK_AIR
    const cx = Math.floor(wx / CHUNK_WIDTH)
    const cz = Math.floor(wz / CHUNK_WIDTH)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return BLOCK_AIR
    const lx = ((wx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((wz % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    return chunk.getBlock(lx, wy, lz)
  }

  setBlock(wx: number, wy: number, wz: number, id: number): void {
    const cx = Math.floor(wx / CHUNK_WIDTH)
    const cz = Math.floor(wz / CHUNK_WIDTH)
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    const lx = ((wx % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((wz % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    chunk.setBlock(lx, wy, lz, id)
    this.rebuildChunk(cx, cz)

    if (lx === 0) this.rebuildChunk(cx - 1, cz)
    if (lx === CHUNK_WIDTH - 1) this.rebuildChunk(cx + 1, cz)
    if (lz === 0) this.rebuildChunk(cx, cz - 1)
    if (lz === CHUNK_WIDTH - 1) this.rebuildChunk(cx, cz + 1)
  }

  private rebuildChunk(cx: number, cz: number): void {
    const chunk = this.getChunk(cx, cz)
    if (!chunk) return
    const geo = buildChunkGeometry(chunk, (wx, wy, wz) => this.getBlock(wx, wy, wz))
    this.renderer.addChunkMesh(cx, cz, geo)
    this.chunkCollider.add(cx, cz, geo)
  }

  update(playerX: number, playerZ: number): void {
    const pcx = Math.floor(playerX / CHUNK_WIDTH)
    const pcz = Math.floor(playerZ / CHUNK_WIDTH)

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = pcx + dx
        const cz = pcz + dz
        const k = this.key(cx, cz)
        if (!this.chunks.has(k)) {
          this.chunks.set(k, null)
          this.generateQueue.push([cx, cz])
        }
      }
    }

    const next = this.generateQueue.shift()
    if (next) {
      const [cx, cz] = next
      const chunk = generateChunk(cx, cz)
      this.chunks.set(this.key(cx, cz), chunk)
      this.rebuildChunk(cx, cz)
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunk) continue
      const [cxStr, czStr] = key.split(',')
      const cx = parseInt(cxStr), cz = parseInt(czStr)
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
        this.renderer.removeChunkMesh(cx, cz)
        this.chunkCollider.remove(cx, cz)
        this.chunks.delete(key)
      }
    }
  }
}
```

- [ ] **Step 4: コンパイルエラーがないことを確認する**

```bash
pnpm dev
```

Expected: コンパイルエラーなし

- [ ] **Step 5: コミットする**

```bash
git add src/physics/ src/world/World.ts
git commit -m "feat: Physics（Rapier）+ ChunkCollider + World（チャンクライフサイクル）"
```

---

## Task 7: Raycast (DDA)

**Files:**
- Create: `src/player/Raycast.ts`
- Test: `src/player/Raycast.test.ts`

**Interfaces:**
- Consumes: `getBlock: (x: number, y: number, z: number) => number`
- Produces:
  - `RaycastResult`: `{ blockPos: [number,number,number]; faceNormal: [number,number,number] }`
  - `raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number, getBlock: (x,y,z)=>number): RaycastResult | null`

- [ ] **Step 1: テストを書く**

`src/player/Raycast.test.ts`:
```typescript
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
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pnpm test
```

Expected: FAIL

- [ ] **Step 3: `src/player/Raycast.ts` を書く**

```typescript
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
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
pnpm test
```

Expected: PASS (全テスト)

- [ ] **Step 5: コミットする**

```bash
git add src/player/Raycast.ts src/player/Raycast.test.ts
git commit -m "feat: DDAレイキャスト（ブロック選択・面法線取得）"
```

---

## Task 8: Player

**Files:**
- Create: `src/player/Player.ts`

**Interfaces:**
- Consumes:
  - `Physics.world: RAPIER.World`
  - `Renderer.camera: THREE.PerspectiveCamera`
  - `World.getBlock(wx,wy,wz): number`
  - `World.setBlock(wx,wy,wz,id): void`
  - `raycast(origin, direction, maxDist, getBlock): RaycastResult | null`
  - 定数: `PLAYER_HEIGHT`, `PLAYER_RADIUS`, `PLAYER_SPEED`, `JUMP_FORCE`, `REACH_DISTANCE`, `BLOCK_AIR`
- Produces:
  - `Player`: クラス `{ position: THREE.Vector3; selectedBlockId: number; update(delta: number): void }`

- [ ] **Step 1: `src/player/Player.ts` を書く**

```typescript
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { raycast } from './Raycast'
import {
  PLAYER_HEIGHT, PLAYER_RADIUS, PLAYER_SPEED, JUMP_FORCE, REACH_DISTANCE,
  BLOCK_AIR
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
    window.addEventListener('keydown', e => { this.keys[e.code] = true })
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

    window.addEventListener('keydown', e => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 5) this.selectedBlockId = num
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
    this.velocityY += -20 * delta

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
```

- [ ] **Step 2: コンパイルエラーがないことを確認する**

```bash
pnpm dev
```

Expected: コンパイルエラーなし

- [ ] **Step 3: コミットする**

```bash
git add src/player/Player.ts
git commit -m "feat: Player（Rapier KCC・一人称入力・ブロック操作）"
```

---

## Task 9: UI

**Files:**
- Create: `src/ui/UI.ts`

**Interfaces:**
- Consumes: `getBlock(id): BlockDef`, `BLOCK_AIR`
- Produces:
  - `UI`: クラス `{ update(x: number, y: number, z: number, fps: number, selectedId: number): void }`

- [ ] **Step 1: `src/ui/UI.ts` を書く**

```typescript
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
```

- [ ] **Step 2: コミットする**

```bash
git add src/ui/UI.ts
git commit -m "feat: UI overlay（十字線・ホットバー・デバッグ情報）"
```

---

## Task 10: main.ts 統合

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `Renderer`, `Physics`, `ChunkCollider`, `World`, `Player`, `UI`

- [ ] **Step 1: `src/main.ts` を完成させる**

```typescript
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
```

- [ ] **Step 2: 開発サーバーを起動してゲームを確認する**

```bash
pnpm dev
```

ブラウザで `http://localhost:5173` を開き、以下を確認する:
- 地形が生成されて表示される
- 画面をクリックするとPointer Lockが有効になる
- WASD で移動できる
- Space でジャンプできる
- 左クリックでブロックを破壊できる
- 右クリックでブロックを配置できる
- 1〜5キーでホットバーが切り替わる
- 画面左上に座標・FPSが表示される

- [ ] **Step 3: 最終テストが全て通ることを確認する**

```bash
pnpm test
```

Expected: PASS (全テスト)

- [ ] **Step 4: 最終コミットをする**

```bash
git add src/main.ts
git commit -m "feat: main.ts 統合（ゲームループ・全システム接続）"
```

---

## スペックカバレッジ

| 要件 | 対応タスク |
|------|-----------|
| ブラウザ動作 (Three.js) | Task 5, 10 |
| コアメカニクスのみ | 全体スコープ |
| シングルプレイヤー | Task 8（マルチなし） |
| 手続き生成 (Perlinノイズ) | Task 3 |
| 5種ブロック | Task 2 |
| 一人称視点 (FPS) | Task 8 |
| Rapier 物理 | Task 6, 8 |
| DDA レイキャスト | Task 7 |
| チャンクライフサイクル | Task 6 |
| テクスチャアトラス | Task 4 |
| フォグ | Task 5 |
| 十字線・ホットバー・デバッグ | Task 9 |
| フレーム分散チャンク生成 | Task 6 |
