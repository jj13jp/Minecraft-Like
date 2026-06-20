# 影mod（動的影 + 頂点AO + トーンマッピング）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three.js プロトタイプに、動的な太陽の影・頂点AO（スムースライティング）・ACESトーンマッピングを追加し、Minecraftの影mod風のビジュアルにする。

**Architecture:** ChunkMesh のジオメトリ生成時に各頂点のAO（明度倍率）を頂点カラー属性として焼く。Renderer で WebGLRenderer のシャドウマップとトーンマッピングを有効化し、太陽 DirectionalLight に castShadow を設定、シャドウ錐台をプレイヤー追従させる。太陽方向は Renderer の可変フィールドとし、後から方向をアニメートするだけで昼夜サイクルへ拡張できる構造にする。

**Tech Stack:** Three.js 0.170（WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping）, TypeScript strict, Vite, Vitest

## Global Constraints

- パッケージマネージャー: pnpm のみ（npm・yarn 不可）
- TypeScript strict モード（noUnusedLocals/noUnusedParameters 有効）
- Three.js 0.170（WebGLRenderer）
- 既存の巻き順・UV・フェイスカリング・positions は変更しない（ChunkMesh）
- 昼夜サイクル・太陽の移動・ポスト処理（ブルーム等）はスコープ外。ただし太陽方向は後から差し替え可能な構造にする
- テスト: Vitest（AO純ロジックのみ。影・トーンマッピング・太陽追従は視覚要素のためブラウザ検証）
- ブロックID: 0=air, 1=bedrock, 2=stone, 3=dirt, 4=grass, 5=wood

---

## ファイルマップ

```
src/
├── constants.ts          # 影・AO関連の定数を追加（SUN_DIRECTION, SHADOW_*, AO_LEVELS）
├── world/
│   ├── ChunkMesh.ts       # computeVertexAO 追加 + buildChunkGeometry に color属性を焼く
│   └── ChunkMesh.test.ts  # AO のテストを追加（既存テストは維持）
├── renderer/
│   └── Renderer.ts        # shadowMap/toneMapping有効化, 太陽castShadow+追従, vertexColors, mesh shadow flags
└── main.ts                # レンダーループで renderer.updateSun(...) を呼ぶ
```

---

## Task 1: computeVertexAO（頂点AOの純ロジック）

**Files:**
- Modify: `src/world/ChunkMesh.ts`（`computeVertexAO` を export 追加）
- Test: `src/world/ChunkMesh.test.ts`（テスト追加。既存テストは維持）

**Interfaces:**
- Produces: `computeVertexAO(side1: boolean, side2: boolean, corner: boolean): number` — 遮蔽レベル 0..3 を返す（0=遮蔽なし/最も明るい, 3=最大遮蔽/最も暗い）

- [ ] **Step 1: 失敗するテストを追加する**

`src/world/ChunkMesh.test.ts` の末尾（最後の `})` の後）に追記:
```typescript
import { computeVertexAO } from './ChunkMesh'

describe('computeVertexAO', () => {
  it('両辺ソリッドは最大遮蔽3（角は無関係）', () => {
    expect(computeVertexAO(true, true, false)).toBe(3)
    expect(computeVertexAO(true, true, true)).toBe(3)
  })
  it('遮蔽なしは0', () => {
    expect(computeVertexAO(false, false, false)).toBe(0)
  })
  it('片辺のみは1', () => {
    expect(computeVertexAO(true, false, false)).toBe(1)
    expect(computeVertexAO(false, true, false)).toBe(1)
  })
  it('角のみは1', () => {
    expect(computeVertexAO(false, false, true)).toBe(1)
  })
  it('片辺+角は2', () => {
    expect(computeVertexAO(true, false, true)).toBe(2)
  })
})
```

注: 既存の `import { ... } from './ChunkMesh'` 行があるため、重複importにならないよう既存の import 文に `computeVertexAO` を加えてもよい（その場合この追加import行は書かない）。

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test ChunkMesh`
Expected: FAIL（`computeVertexAO` が存在しない）

- [ ] **Step 3: `computeVertexAO` を実装する**

`src/world/ChunkMesh.ts` の `getTileCol` 関数の直後に追加:
```typescript
// 頂点AOの遮蔽レベルを返す（0=遮蔽なし/明, 3=最大遮蔽/暗）。
// 古典的Minecraft規則: 両辺ソリッドなら角に関わらず最大遮蔽。
export function computeVertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 3
  return (side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0)
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test ChunkMesh`
Expected: PASS（computeVertexAO のテスト + 既存の法線/UVテスト）

- [ ] **Step 5: コミットする**

```bash
git add src/world/ChunkMesh.ts src/world/ChunkMesh.test.ts
git commit -m "feat: 頂点AOの遮蔽レベル計算 computeVertexAO を追加"
```

---

## Task 2: buildChunkGeometry にAO頂点カラーを焼く

**Files:**
- Modify: `src/world/ChunkMesh.ts`（FACES に tangents 追加、buildChunkGeometry に color属性）
- Modify: `src/constants.ts`（`AO_LEVELS` 追加）
- Test: `src/world/ChunkMesh.test.ts`（color属性のテスト追加）

**Interfaces:**
- Consumes: `computeVertexAO`（Task 1）, 定数 `AO_LEVELS`
- Produces: `buildChunkGeometry` が返す geometry に `color`（Float32, itemSize 3, グレースケール明度）属性が付く

- [ ] **Step 1: `AO_LEVELS` を constants.ts に追加する**

`src/constants.ts` の末尾に追加:
```typescript
// 頂点AO: 遮蔽レベル(0..3) → 明度倍率。index 0=遮蔽なし(最も明るい)
export const AO_LEVELS = [1.0, 0.75, 0.55, 0.4]
```

- [ ] **Step 2: 失敗するテストを追加する**

`src/world/ChunkMesh.test.ts` の `describe('buildChunkGeometry', ...)` ブロック内（既存の it の後）に2つ追加:
```typescript
  it('単一ブロックは全頂点が遮蔽なし（color=1.0）', () => {
    const chunk = new Chunk(0, 0)
    chunk.setBlock(8, 10, 8, BLOCK_STONE)
    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    const color = geo.getAttribute('color')
    expect(color).toBeTruthy()
    expect(color.count).toBe(geo.getAttribute('position').count)
    for (let i = 0; i < color.count; i++) {
      expect(color.getX(i)).toBeCloseTo(1.0)
    }
  })

  it('床の上のブロックはAO遮蔽で一部 color<1.0 になる', () => {
    const chunk = new Chunk(0, 0)
    for (let x = 6; x <= 10; x++) chunk.setBlock(x, 10, 8, BLOCK_STONE) // 床
    chunk.setBlock(8, 11, 8, BLOCK_STONE)                              // 床の上のブロック
    const geo = buildChunkGeometry(chunk, () => BLOCK_AIR)
    const color = geo.getAttribute('color')
    let hasDark = false
    for (let i = 0; i < color.count; i++) {
      if (color.getX(i) < 0.999) hasDark = true
    }
    expect(hasDark).toBe(true)
  })
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test ChunkMesh`
Expected: FAIL（color属性が存在しない → `color` が null で `.count` 参照エラー、または toBeTruthy 失敗）

- [ ] **Step 4: buildChunkGeometry にAOを実装する**

`src/world/ChunkMesh.ts` を以下のように変更する。

(a) import に `AO_LEVELS` を追加（既存の constants import 行を置換）:
```typescript
import { CHUNK_WIDTH, CHUNK_HEIGHT, BLOCK_AIR, AO_LEVELS } from '../constants'
```

(b) FACES の型と各要素に `tangents`（法線に直交する2軸の単位ベクトル）を追加。FACES 定義全体を以下に置換:
```typescript
const FACES: {
  dir: [number,number,number]
  uvFace: UVFace
  corners: [number,number,number][]
  uvCorners: [number,number][]
  tangents: [[number,number,number],[number,number,number]]
}[] = [
  { dir: [0, 1, 0], uvFace: 'top',    corners: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], uvCorners: [[0,0],[1,0],[1,1],[0,1]], tangents: [[1,0,0],[0,0,1]] },
  { dir: [0,-1, 0], uvFace: 'bottom', corners: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], uvCorners: [[0,1],[1,1],[1,0],[0,0]], tangents: [[1,0,0],[0,0,1]] },
  { dir: [1, 0, 0], uvFace: 'side',   corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], uvCorners: [[1,1],[1,0],[0,0],[0,1]], tangents: [[0,1,0],[0,0,1]] },
  { dir: [-1,0, 0], uvFace: 'side',   corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], uvCorners: [[0,1],[0,0],[1,0],[1,1]], tangents: [[0,1,0],[0,0,1]] },
  { dir: [0, 0, 1], uvFace: 'side',   corners: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]], uvCorners: [[1,1],[0,1],[0,0],[1,0]], tangents: [[1,0,0],[0,1,0]] },
  { dir: [0, 0,-1], uvFace: 'side',   corners: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], uvCorners: [[0,1],[1,1],[1,0],[0,0]], tangents: [[1,0,0],[0,1,0]] },
]
```

(c) `getTileCol` 関数の後（`computeVertexAO` の前後どちらでもよい）に、ソリッド判定ヘルパーを追加:
```typescript
// チャンクローカル座標 (lx,ly,lz) のブロックがソリッドか。範囲外は隣接チャンク参照。
function isSolidAt(
  chunk: Chunk,
  getNeighborBlock: (wx: number, wy: number, wz: number) => number,
  lx: number, ly: number, lz: number,
): boolean {
  const id = chunk.isInBounds(lx, ly, lz)
    ? chunk.getBlock(lx, ly, lz)
    : getNeighborBlock(chunk.cx * CHUNK_WIDTH + lx, ly, chunk.cz * CHUNK_WIDTH + lz)
  return id !== BLOCK_AIR && getBlock(id).solid
}
```

(d) `buildChunkGeometry` 本体を変更する。`const uvs: number[] = []` の下に `const colors: number[] = []` を追加し、頂点ループ（`for (let ci = ...)` ブロック）を以下に置換、最後に color 属性を setAttribute する。

`buildChunkGeometry` の中の `const colors` 宣言追加:
```typescript
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  let vertexCount = 0
```

頂点ループ（既存の `for (let ci = 0; ci < face.corners.length; ci++) { ... }` 全体）を置換:
```typescript
          for (let ci = 0; ci < face.corners.length; ci++) {
            const [cx, cy, cz] = face.corners[ci]
            positions.push(lx + cx, ly + cy, lz + cz)
            const [uFrac, vFrac] = face.uvCorners[ci]
            uvs.push(u0 + uFrac * TILE_UV, vFrac * TILE_UV)

            // AO: 面法線方向に1つ進んだ平面で、この隅に接する2辺ブロックと角ブロックを見る
            const [t1, t2] = face.tangents
            const s1 = (cx * t1[0] + cy * t1[1] + cz * t1[2]) === 1 ? 1 : -1
            const s2 = (cx * t2[0] + cy * t2[1] + cz * t2[2]) === 1 ? 1 : -1
            const bx = lx + dx, by = ly + dy, bz = lz + dz
            const side1 = isSolidAt(chunk, getNeighborBlock, bx + s1 * t1[0], by + s1 * t1[1], bz + s1 * t1[2])
            const side2 = isSolidAt(chunk, getNeighborBlock, bx + s2 * t2[0], by + s2 * t2[1], bz + s2 * t2[2])
            const cornerB = isSolidAt(
              chunk, getNeighborBlock,
              bx + s1 * t1[0] + s2 * t2[0],
              by + s1 * t1[1] + s2 * t2[1],
              bz + s1 * t1[2] + s2 * t2[2],
            )
            const ao = AO_LEVELS[computeVertexAO(side1, side2, cornerB)]
            colors.push(ao, ao, ao)
          }
```

注: `dx, dy, dz` は既存の `const [dx, dy, dz] = face.dir` で定義済み（このループの外側、面ループの先頭）。そのまま参照できる。

geometry 構築部に color 属性を追加（`setAttribute('uv', ...)` の後）:
```typescript
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（AO color テスト2件 + computeVertexAO + 既存の法線/UV/Chunk/worldgen/BlockRegistry/Raycast）

- [ ] **Step 6: ビルドが通ることを確認する**

Run: `pnpm build`
Expected: エラーなし（tsc strict + vite）

- [ ] **Step 7: コミットする**

```bash
git add src/world/ChunkMesh.ts src/constants.ts src/world/ChunkMesh.test.ts
git commit -m "feat: チャンクメッシュに頂点AO（color属性）を焼く"
```

---

## Task 3: Renderer の影・トーンマッピング・太陽追従 + main 結線

**Files:**
- Modify: `src/constants.ts`（SUN_DIRECTION, SHADOW_MAP_SIZE, SHADOW_CAMERA_EXTENT, SHADOW_BIAS）
- Modify: `src/renderer/Renderer.ts`（shadowMap, toneMapping, sun castShadow + 追従, vertexColors, mesh shadow flags, setSunDirection/updateSun）
- Modify: `src/main.ts`（ループで updateSun 呼び出し）

**Interfaces:**
- Consumes: 定数 `SUN_DIRECTION`, `SHADOW_MAP_SIZE`, `SHADOW_CAMERA_EXTENT`, `SHADOW_BIAS`, `RENDER_DISTANCE`, `CHUNK_WIDTH`
- Produces:
  - `Renderer.setSunDirection(x: number, y: number, z: number): void` — 太陽方向（光の進行方向）を差し替える。将来の昼夜サイクル用
  - `Renderer.updateSun(px: number, py: number, pz: number): void` — プレイヤー位置に追従させ、シャドウ錐台を更新

- [ ] **Step 1: 影・太陽の定数を constants.ts に追加する**

`src/constants.ts` の末尾（`AO_LEVELS` の後）に追加:
```typescript
// 太陽の光が進む方向（正規化はRenderer側で行う）。後からこの方向をアニメートすれば昼夜サイクルになる
export const SUN_DIRECTION: [number, number, number] = [-0.5, -1, -0.3]
// シャドウマップ解像度
export const SHADOW_MAP_SIZE = 2048
// シャドウ正射影カメラの半幅。±RENDER_DISTANCE チャンクをカバー
export const SHADOW_CAMERA_EXTENT = RENDER_DISTANCE * CHUNK_WIDTH
// シャドウアクネ防止バイアス
export const SHADOW_BIAS = -0.0005
```

注: `RENDER_DISTANCE` と `CHUNK_WIDTH` は同ファイル内で定義済みのため、この行より上にあることを確認する（無ければ末尾に書けば順序問題は起きない＝定数は実行時評価）。

- [ ] **Step 2: Renderer.ts を変更する**

(a) import を置換（先頭付近）:
```typescript
import * as THREE from 'three'
import { createTextureAtlas } from './TextureAtlas'
import {
  RENDER_DISTANCE, CHUNK_WIDTH,
  SUN_DIRECTION, SHADOW_MAP_SIZE, SHADOW_CAMERA_EXTENT, SHADOW_BIAS,
} from '../constants'
```

(b) クラスのフィールドに太陽関連を追加（`private chunkMeshes = ...` の後）:
```typescript
  private chunkMeshes = new Map<string, THREE.Mesh>()
  private sun: THREE.DirectionalLight
  private sunDirection = new THREE.Vector3(...SUN_DIRECTION).normalize()
  private readonly sunDistance = 100
```

(c) コンストラクタの該当箇所を置換する。

レンダラ生成部（`this.renderer = ...` から `document.body.appendChild(...)` まで）を以下に置換:
```typescript
    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    document.body.appendChild(this.renderer.domElement)
```

ライト生成部（`const ambientLight = ...` から `this.scene.add(sunLight)` まで）を以下に置換:
```typescript
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
```

マテリアル生成部を置換（`vertexColors: true` を追加）:
```typescript
    const atlas = createTextureAtlas()
    this.material = new THREE.MeshLambertMaterial({ map: atlas, side: THREE.FrontSide, vertexColors: true })
```

(d) `addChunkMesh` のメッシュ生成後に shadow フラグを追加:
```typescript
  addChunkMesh(cx: number, cz: number, geometry: THREE.BufferGeometry): void {
    this.removeChunkMesh(cx, cz)
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(cx * CHUNK_WIDTH, 0, cz * CHUNK_WIDTH)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.scene.add(mesh)
    this.chunkMeshes.set(`${cx},${cz}`, mesh)
  }
```

(e) `start` メソッドの前に2つのメソッドを追加:
```typescript
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
```

- [ ] **Step 3: main.ts のループで updateSun を呼ぶ**

`src/main.ts` の `renderer.start((delta) => { ... })` コールバック内、`world.update(...)` の行の直後に追加:
```typescript
    renderer.updateSun(player.position.x, player.position.y, player.position.z)
```

（既存の該当箇所の例）:
```typescript
  renderer.start((delta) => {
    physics.step(delta)
    player.update(delta)
    world.update(player.position.x, player.position.z)
    renderer.updateSun(player.position.x, player.position.y, player.position.z)

    fpsAccum += delta
    // ... 既存のFPS集計・ui.update はそのまま
```

- [ ] **Step 4: ビルドとテストを確認する**

Run: `pnpm build && pnpm test`
Expected: ビルドエラーなし、全テスト PASS（既存 + Task1/2 の追加分）

- [ ] **Step 5: ブラウザで視覚検証する**

```bash
# devサーバーをバックグラウンド起動
nohup pnpm dev > /tmp/mc-dev.log 2>&1 &
```

ブラウザ（Playwright 等）で `http://localhost:5173/` を開きスクリーンショットを撮り、以下を確認:
- ブロックが太陽方向に応じた影を地形に落としている（段差・斜面の陰）
- ブロックの隅・凹角がAOで暗くなり、立体感が出ている
- 全体がトーンマッピングで自然な明るさ（白飛び・黒潰れしていない）
- コンソールに致命的エラーがない（favicon 404 は無害）

必要に応じて `AO_LEVELS` の暗さ、ambient/sun 強度、`SUN_DIRECTION` を視覚調整する（constants.ts）。
**検証後、dev サーバーを必ず終了し、保存したスクリーンショットは削除する。**

- [ ] **Step 6: コミットする**

```bash
git add src/constants.ts src/renderer/Renderer.ts src/main.ts
git commit -m "feat: 動的な太陽の影・ACESトーンマッピング・太陽のプレイヤー追従を追加"
```

---

## スペックカバレッジ

| spec要件 | 対応タスク |
|---|---|
| 動的な太陽の影（shadowMap, castShadow, 錐台, bias） | Task 3 |
| 太陽のプレイヤー追従 | Task 3（updateSun） |
| 太陽方向を後から差し替え可能（昼夜サイクル拡張性） | Task 3（sunDirection フィールド + setSunDirection） |
| 頂点AO（スムースライティング） | Task 1（computeVertexAO） + Task 2（color属性） |
| ACESトーンマッピング | Task 3 |
| マテリアル vertexColors | Task 3 |
| 定数化（SUN_DIRECTION, SHADOW_*, AO_LEVELS） | Task 2, 3 |
| 既存の巻き順/UV/カリング不変 | Task 2（positions/uv/index は変更せず color のみ追加） |
| AO純ロジックのテスト | Task 1, 2 |
