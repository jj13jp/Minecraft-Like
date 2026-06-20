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

// タイルの外周に1pxの半透明黒枠を焼く。各ブロック面が必ず1タイル＝面の縁に
// 輪郭が出るため、隣接ブロックの境目がグリッド状に見えるようになる。
function drawTileBorder(ctx: CanvasRenderingContext2D, col: number) {
  const x = col * TILE_SIZE
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(x, 0, TILE_SIZE, 1)                  // 上辺
  ctx.fillRect(x, TILE_SIZE - 1, TILE_SIZE, 1)      // 下辺
  ctx.fillRect(x, 0, 1, TILE_SIZE)                  // 左辺
  ctx.fillRect(x + TILE_SIZE - 1, 0, 1, TILE_SIZE)  // 右辺
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

  // 使用する全タイル（col 0..5）の縁に輪郭を焼く
  for (let col = 0; col < TILE_COLORS.length; col++) {
    drawTileBorder(ctx, col)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = false
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  return texture
}
