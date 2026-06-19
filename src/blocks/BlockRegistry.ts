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
