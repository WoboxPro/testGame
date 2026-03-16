<template>
  <div class="page">
    <div class="hud">
      <h1>Game3: Chess on Pixi Game2</h1>
      <p>{{ statusText }}</p>
      <button @click="resetGame">New Game</button>
    </div>
    <div ref="canvasHost" class="canvas-host" />
  </div>
</template>

<script setup>
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue';
import { World } from '../../pixi_game2/pixigame/src/World.js';
import { GameEntity } from '../../pixi_game2/pixigame/src/entities/GameEntity.js';
import { Canvas, Camera } from '../../pixi_game2/pixigame-renderer/src/index.js';

const BOARD_SIZE = 8;
const CELL_SIZE = 80;
const WORLD_WIDTH = BOARD_SIZE * CELL_SIZE;
const WORLD_HEIGHT = BOARD_SIZE * CELL_SIZE;

const LIGHT_CELL = '#e8d7ba';
const DARK_CELL = '#8a6f55';
const SELECTED_CELL = '#2da7ff';
const MOVE_CELL = '#5bd97f';
const CAPTURE_CELL = '#ff6b6b';
const LAST_FROM_CELL = '#d5c06d';
const LAST_TO_CELL = '#f3d55b';
const BASE_CELL_OPACITY = 1.0;
const HIGHLIGHT_CELL_OPACITY = 0.62;

const canvasHost = ref(null);
const turn = ref('white');
const winner = ref(null);

let world = null;
let canvas = null;
let camera = null;
let rafId = null;
let board = createInitialBoard();
let selected = null;
let legalMoves = [];
let cellEntities = [];
let lastMove = null;
const pieceTextureUrlCache = new Map();

const statusText = computed(() => {
  if (winner.value) return `Winner: ${winner.value === 'white' ? 'White' : 'Black'}`;
  return `Turn: ${turn.value === 'white' ? 'White' : 'Black'}`;
});

function makePieceType(col) {
  const order = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  return order[col];
}

function createInitialBoard() {
  const b = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
  for (let c = 0; c < BOARD_SIZE; c++) {
    b[1][c] = { type: 'pawn', color: 'black', entity: null, id: `bp_${c}` };
    b[6][c] = { type: 'pawn', color: 'white', entity: null, id: `wp_${c}` };
    b[0][c] = { type: makePieceType(c), color: 'black', entity: null, id: `b_${makePieceType(c)}_${c}` };
    b[7][c] = { type: makePieceType(c), color: 'white', entity: null, id: `w_${makePieceType(c)}_${c}` };
  }
  return b;
}

function pieceSize(type) {
  switch (type) {
    case 'king': return 62;
    case 'queen': return 58;
    case 'rook': return 54;
    case 'bishop': return 52;
    case 'knight': return 52;
    default: return 50;
  }
}

function pieceLabel(type) {
  // First letter of piece name (engine piece ids).
  return String(type || '').charAt(0).toUpperCase();
}

function getPieceTextureUrl(type, color) {
  const key = `${color}:${type}`;
  const cached = pieceTextureUrlCache.get(key);
  if (cached) return cached;

  const canvasEl = document.createElement('canvas');
  canvasEl.width = 128;
  canvasEl.height = 128;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return null;

  const letter = pieceLabel(type);
  ctx.clearRect(0, 0, 128, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 94px Georgia, serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = color === 'white' ? '#101010' : '#f0f0f0';
  ctx.fillStyle = color === 'white' ? '#ffffff' : '#000000';
  ctx.strokeText(letter, 64, 68);
  ctx.fillText(letter, 64, 68);

  const dataUrl = canvasEl.toDataURL('image/png');
  pieceTextureUrlCache.set(key, dataUrl);
  return dataUrl;
}

function baseCellColor(r, c) {
  return (r + c) % 2 === 0 ? LIGHT_CELL : DARK_CELL;
}

function syncEntityAppearance(entity, patch) {
  if (!entity) return;
  entity.appearance = {
    ...(entity.appearance || {}),
    ...patch
  };
  const comps = world?.entities?.get(entity.id);
  if (comps) {
    comps.set('appearance', entity.appearance);
  }
}

function syncEntityOpacity(entity, opacity) {
  if (!entity) return;
  entity.opacity = opacity;
  const comps = world?.entities?.get(entity.id);
  if (comps) {
    comps.set('opacity', opacity);
  }
}

function applyCellHighlights() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const entity = cellEntities[r][c];
      if (!entity) continue;
      let color = baseCellColor(r, c);

      if (lastMove?.from?.row === r && lastMove?.from?.col === c) {
        color = LAST_FROM_CELL;
      } else if (lastMove?.to?.row === r && lastMove?.to?.col === c) {
        color = LAST_TO_CELL;
      }

      if (selected && selected.row === r && selected.col === c) {
        color = SELECTED_CELL;
      } else {
        const move = legalMoves.find((m) => m.row === r && m.col === c);
        if (move) {
          color = board[r][c] ? CAPTURE_CELL : MOVE_CELL;
        }
      }
      syncEntityAppearance(entity, { color });
      const isHighlighted =
        (selected && selected.row === r && selected.col === c) ||
        (lastMove?.from?.row === r && lastMove?.from?.col === c) ||
        (lastMove?.to?.row === r && lastMove?.to?.col === c) ||
        legalMoves.some((m) => m.row === r && m.col === c);
      syncEntityOpacity(entity, isHighlighted ? HIGHLIGHT_CELL_OPACITY : BASE_CELL_OPACITY);
    }
  }
}

function cellCenter(row, col) {
  return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
}

function spawnBoardEntities() {
  cellEntities = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const center = cellCenter(r, c);
      const cell = markRaw(new GameEntity({
        id: `cell_${r}_${c}`,
        subtype: 'prop',
        worldId: world.id,
        position: center,
        opacity: BASE_CELL_OPACITY,
        appearance: { shape: 'rect', width: CELL_SIZE, height: CELL_SIZE, color: baseCellColor(r, c) }
      }));
      world.addEntity(cell);
      cellEntities[r][c] = cell;
    }
  }
}

function spawnPieceEntities() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const center = cellCenter(r, c);
      const textureUrl = getPieceTextureUrl(piece.type, piece.color);
      const entity = markRaw(new GameEntity({
        id: `piece_${piece.id}`,
        subtype: 'unit',
        worldId: world.id,
        position: center,
        appearance: {
          shape: 'sprite',
          textureUrl,
          width: pieceSize(piece.type),
          height: pieceSize(piece.type)
        }
      }));
      world.addEntity(entity);
      piece.entity = entity;
    }
  }
}

function toCell(worldX, worldY) {
  const col = Math.floor(worldX / CELL_SIZE);
  const row = Math.floor(worldY / CELL_SIZE);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}

function isInside(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function getSlidingMoves(row, col, color, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let rr = row + dr;
    let cc = col + dc;
    while (isInside(rr, cc)) {
      const target = board[rr][cc];
      if (!target) {
        moves.push({ row: rr, col: cc });
      } else {
        if (target.color !== color) moves.push({ row: rr, col: cc });
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return moves;
}

function getLegalMoves(row, col, piece) {
  if (!piece) return [];
  if (piece.type === 'pawn') {
    const moves = [];
    const dir = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    const one = row + dir;
    if (isInside(one, col) && !board[one][col]) {
      moves.push({ row: one, col });
      const two = row + dir * 2;
      if (row === startRow && !board[two][col]) moves.push({ row: two, col });
    }
    for (const dc of [-1, 1]) {
      const rr = row + dir;
      const cc = col + dc;
      if (!isInside(rr, cc)) continue;
      const target = board[rr][cc];
      if (target && target.color !== piece.color) moves.push({ row: rr, col: cc });
    }
    return moves;
  }
  if (piece.type === 'knight') {
    const moves = [];
    const d = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    for (const [dr, dc] of d) {
      const rr = row + dr;
      const cc = col + dc;
      if (!isInside(rr, cc)) continue;
      const target = board[rr][cc];
      if (!target || target.color !== piece.color) moves.push({ row: rr, col: cc });
    }
    return moves;
  }
  if (piece.type === 'bishop') return getSlidingMoves(row, col, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  if (piece.type === 'rook') return getSlidingMoves(row, col, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (piece.type === 'queen') return getSlidingMoves(row, col, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (piece.type === 'king') {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = row + dr;
        const cc = col + dc;
        if (!isInside(rr, cc)) continue;
        const target = board[rr][cc];
        if (!target || target.color !== piece.color) moves.push({ row: rr, col: cc });
      }
    }
    return moves;
  }
  return [];
}

function switchTurn() {
  turn.value = turn.value === 'white' ? 'black' : 'white';
}

function movePiece(from, to) {
  const moving = board[from.row][from.col];
  const captured = board[to.row][to.col];
  if (!moving) return;

  if (captured?.entity) {
    world.removeEntity(captured.entity.id);
    if (captured.type === 'king') winner.value = moving.color;
  }

  board[to.row][to.col] = moving;
  board[from.row][from.col] = null;

  if (moving.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    moving.type = 'queen';
    syncEntityAppearance(moving.entity, {
      textureUrl: getPieceTextureUrl('queen', moving.color),
      width: pieceSize('queen'),
      height: pieceSize('queen')
    });
  }

  const center = cellCenter(to.row, to.col);
  moving.entity.position.x = center.x;
  moving.entity.position.y = center.y;
  lastMove = {
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col }
  };
}

function handleBoardClick(event) {
  if (!camera || winner.value) return;

  const rect = canvas.app.canvas.getBoundingClientRect();
  const sx = (event.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (event.clientY - rect.top) * (canvas.height / rect.height);
  const w = camera.screenToWorld(sx, sy);
  const cell = toCell(w.x, w.y);
  if (!cell) return;

  const clickedPiece = board[cell.row][cell.col];

  if (!selected) {
    if (clickedPiece && clickedPiece.color === turn.value) {
      selected = cell;
      legalMoves = getLegalMoves(cell.row, cell.col, clickedPiece);
      applyCellHighlights();
    }
    return;
  }

  const canMove = legalMoves.some((m) => m.row === cell.row && m.col === cell.col);
  if (canMove) {
    movePiece(selected, cell);
    selected = null;
    legalMoves = [];
    if (!winner.value) switchTurn();
    applyCellHighlights();
    return;
  }

  if (clickedPiece && clickedPiece.color === turn.value) {
    selected = cell;
    legalMoves = getLegalMoves(cell.row, cell.col, clickedPiece);
  } else {
    selected = null;
    legalMoves = [];
  }
  applyCellHighlights();
}

function startLoop() {
  const loop = () => {
    world?.update(16.67);
    canvas?.render();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

async function initScene() {
  world = markRaw(new World({
    id: 'game3_chess_world',
    type: 'bounded',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: '#0a0a0a',
    showBounds: false
  }));

  canvas = markRaw(new Canvas({
    id: 'game3_canvas',
    sizeMode: 'fixed',
    width: 760,
    height: 760,
    backgroundColor: '#11131a',
    antialias: true,
    resolution: 1
  }));
  await canvas.start(canvasHost.value);

  camera = markRaw(new Camera({
    id: 'game3_camera',
    canvas,
    world,
    anchor: 'center',
    width: 760,
    height: 760,
    x: 0,
    y: 0,
    focusX: WORLD_WIDTH / 2,
    focusY: WORLD_HEIGHT / 2,
    zoom: 1,
    showBorder: false
  }));

  spawnBoardEntities();
  spawnPieceEntities();
  applyCellHighlights();
  canvas.app.canvas.addEventListener('click', handleBoardClick);
  startLoop();
}

function cleanupScene() {
  if (canvas?.app?.canvas) {
    canvas.app.canvas.removeEventListener('click', handleBoardClick);
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (canvas) {
    canvas.destroy();
    canvas = null;
  }
  camera = null;
  world = null;
}

async function resetGame() {
  cleanupScene();
  board = createInitialBoard();
  selected = null;
  legalMoves = [];
  lastMove = null;
  turn.value = 'white';
  winner.value = null;
  await initScene();
}

onMounted(async () => {
  await initScene();
});

onUnmounted(() => {
  cleanupScene();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f1218;
  color: #eef3ff;
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 18px;
}

.hud {
  width: 760px;
  background: #1c2230;
  border: 1px solid #2f3a52;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.hud h1 {
  margin: 0;
  font-size: 20px;
}

.hud p {
  margin: 0;
  color: #a8bfec;
}

.hud button {
  margin-left: auto;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #5b86d8;
  border-radius: 8px;
  background: #2a3e67;
  color: #fff;
  cursor: pointer;
}

.canvas-host {
  width: 760px;
  height: 760px;
  border: 2px solid #2f3a52;
  border-radius: 10px;
  overflow: hidden;
}
</style>
