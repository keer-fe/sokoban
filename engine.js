const WALL = 1;
const FLOOR = 2;
const TARGET = 3;
const BOX = 4;
const BOX_ON_TARGET = 5;
const PLAYER = 6;
const PLAYER_ON_TARGET = 7;

const directions = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 }
};

function keyOf(pos) {
  return `${pos.row},${pos.col}`;
}

function clonePos(pos) {
  return { row: pos.row, col: pos.col };
}

function createState(level) {
  const targets = {};
  const boxes = [];
  let player = null;

  level.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const pos = { row: rowIndex, col: colIndex };
      if (cell === TARGET || cell === BOX_ON_TARGET || cell === PLAYER_ON_TARGET) {
        targets[keyOf(pos)] = true;
      }
      if (cell === BOX || cell === BOX_ON_TARGET) {
        boxes.push(pos);
      }
      if (cell === PLAYER || cell === PLAYER_ON_TARGET) {
        player = pos;
      }
    });
  });

  return {
    levelId: level.id,
    level,
    player,
    boxes,
    targets,
    steps: 0,
    undoStack: [],
    completed: false
  };
}

function boxIndexAt(state, row, col) {
  return state.boxes.findIndex((box) => box.row === row && box.col === col);
}

function isWallOrOut(level, row, col) {
  return row < 0 || col < 0 || row >= level.height || col >= level.width || level.grid[row][col] === WALL || level.grid[row][col] === 0;
}

function isCompleted(state) {
  return state.boxes.every((box) => state.targets[keyOf(box)]);
}

function move(state, dirName) {
  if (state.completed) return { type: "blocked" };

  const dir = directions[dirName];
  if (!dir) return { type: "blocked" };
  const next = { row: state.player.row + dir.row, col: state.player.col + dir.col };
  if (isWallOrOut(state.level, next.row, next.col)) return { type: "blocked" };

  const pushedBoxIndex = boxIndexAt(state, next.row, next.col);
  const history = {
    playerBefore: clonePos(state.player),
    playerAfter: clonePos(next),
    boxIndex: pushedBoxIndex,
    boxBefore: null,
    boxAfter: null
  };

  if (pushedBoxIndex >= 0) {
    const boxNext = { row: next.row + dir.row, col: next.col + dir.col };
    if (isWallOrOut(state.level, boxNext.row, boxNext.col) || boxIndexAt(state, boxNext.row, boxNext.col) >= 0) {
      return { type: "blocked" };
    }
    history.boxBefore = clonePos(state.boxes[pushedBoxIndex]);
    history.boxAfter = clonePos(boxNext);
    state.boxes[pushedBoxIndex] = boxNext;
  }

  state.player = next;
  state.steps += 1;
  state.undoStack.push(history);
  state.completed = isCompleted(state);

  return { type: state.completed ? "completed" : pushedBoxIndex >= 0 ? "pushed" : "moved" };
}

function undo(state) {
  const history = state.undoStack.pop();
  if (!history) return false;

  state.player = clonePos(history.playerBefore);
  if (history.boxIndex >= 0 && history.boxBefore) {
    state.boxes[history.boxIndex] = clonePos(history.boxBefore);
  }
  state.steps = Math.max(0, state.steps - 1);
  state.completed = false;
  return true;
}

function starsFor(level, steps) {
  if (steps <= level.threeStarSteps) return 3;
  if (steps <= level.twoStarSteps) return 2;
  return 1;
}

module.exports = {
  BOX,
  BOX_ON_TARGET,
  FLOOR,
  PLAYER,
  TARGET,
  WALL,
  createState,
  keyOf,
  move,
  starsFor,
  undo
};
