<template>
  <div class="chess-page">
    <div class="panel">
      <h1>Chess</h1>
      <p class="status">{{ statusText }}</p>
      <p class="turn">Turn: <strong>{{ turnLabel }}</strong></p>
      <button class="reset-btn" @click="resetGame">New Game</button>
      <div class="captured">
        <div>
          <div class="captured__title">Captured by White</div>
          <div class="captured__pieces">{{ capturedByWhiteSymbols || '—' }}</div>
        </div>
        <div>
          <div class="captured__title">Captured by Black</div>
          <div class="captured__pieces">{{ capturedByBlackSymbols || '—' }}</div>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <div class="board">
        <template v-for="row in 8" :key="`row-${row - 1}`">
          <template v-for="col in 8" :key="`cell-${row - 1}-${col - 1}`">
            <button
              class="cell"
              :class="cellClasses(row - 1, col - 1)"
              @click="onCellClick(row - 1, col - 1)"
            >
              <span class="coord" v-if="col === 1">{{ 8 - (row - 1) }}</span>
              <span class="coord coord--file" v-if="row === 8">{{ fileLabel(col - 1) }}</span>
              <span class="piece">{{ pieceSymbol(board[row - 1][col - 1]) }}</span>
            </button>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PIECE_ORDER = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

const PIECE_SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

const turn = ref('white');
const winner = ref(null);
const board = ref(createInitialBoard());
const selected = ref(null);
const legalMoves = ref([]);
const capturedByWhite = ref([]);
const capturedByBlack = ref([]);

const turnLabel = computed(() => (turn.value === 'white' ? 'White' : 'Black'));

const statusText = computed(() => {
  if (winner.value) return `Winner: ${winner.value === 'white' ? 'White' : 'Black'}`;
  if (selected.value) return `Selected: ${toCellName(selected.value.row, selected.value.col)}`;
  return 'Select a piece and make a move';
});

const capturedByWhiteSymbols = computed(() =>
  capturedByWhite.value.map((p) => PIECE_SYMBOLS.black[p] || '').join(' ')
);

const capturedByBlackSymbols = computed(() =>
  capturedByBlack.value.map((p) => PIECE_SYMBOLS.white[p] || '').join(' ')
);

function createInitialBoard() {
  const b = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: 'pawn', color: 'black' };
    b[6][c] = { type: 'pawn', color: 'white' };
  }

  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: PIECE_ORDER[c], color: 'black' };
    b[7][c] = { type: PIECE_ORDER[c], color: 'white' };
  }

  return b;
}

function resetGame() {
  board.value = createInitialBoard();
  turn.value = 'white';
  winner.value = null;
  selected.value = null;
  legalMoves.value = [];
  capturedByWhite.value = [];
  capturedByBlack.value = [];
}

function pieceSymbol(piece) {
  if (!piece) return '';
  return PIECE_SYMBOLS[piece.color][piece.type];
}

function fileLabel(col) {
  return FILES[col];
}

function cellClasses(row, col) {
  const isDark = (row + col) % 2 === 1;
  const isSelected = selected.value?.row === row && selected.value?.col === col;
  const canMove = legalMoves.value.some((m) => m.row === row && m.col === col);
  const hasEnemy = canMove && board.value[row][col];
  return {
    'cell--dark': isDark,
    'cell--light': !isDark,
    'cell--selected': isSelected,
    'cell--move': canMove && !hasEnemy,
    'cell--capture': hasEnemy
  };
}

function onCellClick(row, col) {
  if (winner.value) return;

  const clickedPiece = board.value[row][col];

  if (selected.value) {
    if (tryMove(row, col)) return;

    if (clickedPiece && clickedPiece.color === turn.value) {
      selectPiece(row, col);
      return;
    }

    clearSelection();
    return;
  }

  if (clickedPiece && clickedPiece.color === turn.value) {
    selectPiece(row, col);
  }
}

function selectPiece(row, col) {
  const piece = board.value[row][col];
  if (!piece || piece.color !== turn.value) return;
  selected.value = { row, col };
  legalMoves.value = getLegalMoves(board.value, row, col, piece);
}

function clearSelection() {
  selected.value = null;
  legalMoves.value = [];
}

function tryMove(targetRow, targetCol) {
  if (!selected.value) return false;
  const valid = legalMoves.value.some((m) => m.row === targetRow && m.col === targetCol);
  if (!valid) return false;

  const from = selected.value;
  const movingPiece = board.value[from.row][from.col];
  const targetPiece = board.value[targetRow][targetCol];

  board.value[targetRow][targetCol] = movingPiece;
  board.value[from.row][from.col] = null;

  if (targetPiece) {
    if (turn.value === 'white') {
      capturedByWhite.value.push(targetPiece.type);
    } else {
      capturedByBlack.value.push(targetPiece.type);
    }
  }

  if (movingPiece.type === 'pawn') {
    if ((movingPiece.color === 'white' && targetRow === 0) || (movingPiece.color === 'black' && targetRow === 7)) {
      movingPiece.type = 'queen';
    }
  }

  if (targetPiece?.type === 'king') {
    winner.value = turn.value;
  } else {
    turn.value = turn.value === 'white' ? 'black' : 'white';
  }

  clearSelection();
  return true;
}

function getLegalMoves(currentBoard, row, col, piece) {
  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(currentBoard, row, col, piece.color);
    case 'knight':
      return getKnightMoves(currentBoard, row, col, piece.color);
    case 'bishop':
      return getSlidingMoves(currentBoard, row, col, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    case 'rook':
      return getSlidingMoves(currentBoard, row, col, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
    case 'queen':
      return getSlidingMoves(currentBoard, row, col, piece.color, [
        [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]
      ]);
    case 'king':
      return getKingMoves(currentBoard, row, col, piece.color);
    default:
      return [];
  }
}

function getPawnMoves(currentBoard, row, col, color) {
  const moves = [];
  const dir = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  const oneStep = row + dir;
  if (isInside(oneStep, col) && !currentBoard[oneStep][col]) {
    moves.push({ row: oneStep, col });
    const twoStep = row + dir * 2;
    if (row === startRow && !currentBoard[twoStep][col]) {
      moves.push({ row: twoStep, col });
    }
  }

  for (const dc of [-1, 1]) {
    const rr = row + dir;
    const cc = col + dc;
    if (!isInside(rr, cc)) continue;
    const target = currentBoard[rr][cc];
    if (target && target.color !== color) {
      moves.push({ row: rr, col: cc });
    }
  }

  return moves;
}

function getKnightMoves(currentBoard, row, col, color) {
  const deltas = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
  ];
  const moves = [];

  for (const [dr, dc] of deltas) {
    const rr = row + dr;
    const cc = col + dc;
    if (!isInside(rr, cc)) continue;
    const target = currentBoard[rr][cc];
    if (!target || target.color !== color) {
      moves.push({ row: rr, col: cc });
    }
  }

  return moves;
}

function getKingMoves(currentBoard, row, col, color) {
  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = row + dr;
      const cc = col + dc;
      if (!isInside(rr, cc)) continue;
      const target = currentBoard[rr][cc];
      if (!target || target.color !== color) {
        moves.push({ row: rr, col: cc });
      }
    }
  }
  return moves;
}

function getSlidingMoves(currentBoard, row, col, color, directions) {
  const moves = [];

  for (const [dr, dc] of directions) {
    let rr = row + dr;
    let cc = col + dc;
    while (isInside(rr, cc)) {
      const target = currentBoard[rr][cc];
      if (!target) {
        moves.push({ row: rr, col: cc });
      } else {
        if (target.color !== color) {
          moves.push({ row: rr, col: cc });
        }
        break;
      }
      rr += dr;
      cc += dc;
    }
  }

  return moves;
}

function isInside(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function toCellName(row, col) {
  return `${FILES[col]}${8 - row}`;
}
</script>

<style scoped>
.chess-page {
  min-height: 100vh;
  padding: 24px;
  background: #11131a;
  color: #e8e8e8;
  display: grid;
  grid-template-columns: 280px auto;
  gap: 20px;
  align-items: start;
}

.panel {
  background: #1b2030;
  border: 1px solid #2b334a;
  border-radius: 10px;
  padding: 16px;
  display: grid;
  gap: 10px;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.status {
  margin: 0;
  color: #9ec8ff;
}

.turn {
  margin: 0;
}

.reset-btn {
  height: 36px;
  border: 1px solid #4a75b8;
  border-radius: 8px;
  background: #233553;
  color: #fff;
  cursor: pointer;
}

.captured {
  display: grid;
  gap: 10px;
}

.captured__title {
  font-size: 12px;
  color: #9fb1d1;
}

.captured__pieces {
  min-height: 28px;
  font-size: 24px;
}

.board-wrap {
  display: grid;
  justify-content: center;
}

.board {
  width: min(86vmin, 720px);
  height: min(86vmin, 720px);
  aspect-ratio: 1 / 1;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  border: 2px solid #2b334a;
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: none;
  padding: 0;
  margin: 0;
  display: grid;
  place-items: center;
  font-size: clamp(24px, 4.2vmin, 46px);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.cell--light { background: #eadac1; }
.cell--dark { background: #9a7c60; }
.cell--selected { outline: 3px solid #00c2ff; outline-offset: -3px; }
.cell--move::after,
.cell--capture::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.cell--move::after {
  width: 22%;
  height: 22%;
  background: rgba(0, 120, 255, 0.45);
}

.cell--capture::after {
  inset: 12%;
  border: 4px solid rgba(255, 70, 70, 0.8);
}

.piece {
  position: relative;
  z-index: 2;
  line-height: 1;
}

.coord {
  position: absolute;
  left: 4px;
  top: 2px;
  font-size: 11px;
  color: rgba(10, 10, 10, 0.6);
  z-index: 3;
}

.coord--file {
  left: auto;
  top: auto;
  right: 4px;
  bottom: 2px;
}

@media (max-width: 980px) {
  .chess-page {
    grid-template-columns: 1fr;
  }
}
</style>
