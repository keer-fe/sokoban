import { detectDeadlock, findDeadSquares } from './deadlock.js';

export const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function parseLevel(level) {
  const width = level.rows[0].length;
  const walls = new Set();
  const floors = new Set();
  const goals = new Set();
  const boxes = [];
  const players = [];
  level.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Non-rectangular level: ${level.id}`);
    Array.from(row).forEach((cell, x) => {
      const pos = y * width + x;
      if (cell === '#') walls.add(pos);
      else if (' .$@*+'.includes(cell)) floors.add(pos);
      else if (cell !== '_') throw new Error(`Unknown tile: ${cell}`);
      if ('.*+'.includes(cell)) goals.add(pos);
      if ('$*'.includes(cell)) boxes.push(pos);
      if ('@+'.includes(cell)) players.push(pos);
    });
  });
  if (players.length !== 1 || !boxes.length || boxes.length !== goals.size) throw new Error('Invalid level actors');
  return { width, height: level.rows.length, walls, floors, goals, boxes, player: players[0] };
}

export function isComplete(board, state) { return state.boxes.every((pos) => board.goals.has(pos)); }

// Pure transition shared by the runtime and the shortest-path verifier.
export function transition(board, state, direction) {
  const delta = directions[direction];
  if (!delta) return null;
  const neighbor = (pos) => {
    const x = pos % board.width + delta[0];
    const y = Math.floor(pos / board.width) + delta[1];
    return x < 0 || x >= board.width || y < 0 || y >= board.height ? -1 : y * board.width + x;
  };
  const next = neighbor(state.player);
  if (!board.floors.has(next)) return null;
  const boxes = [...state.boxes];
  const boxIndex = boxes.indexOf(next);
  if (boxIndex !== -1) {
    const target = neighbor(next);
    if (!board.floors.has(target) || boxes.includes(target)) return null;
    boxes[boxIndex] = target;
  }
  return { player: next, boxes, steps: state.steps + 1, facing: direction };
}

export class GameSession {
  constructor(level) {
    this.level = level;
    this.board = parseLevel(level);
    this.deadSquares = findDeadSquares(this.board);
    this.restart();
  }
  restart() {
    this.state = { player: this.board.player, boxes: [...this.board.boxes], steps: 0, facing: 'down' };
    this.history = [];
    this.moves = [];
    this.deadlock = detectDeadlock(this.board, this.state, this.deadSquares);
  }
  get complete() { return isComplete(this.board, this.state); }
  move(direction) {
    if (this.complete) return false;
    const next = transition(this.board, this.state, direction);
    if (!next) return false;
    this.history.push(this.state);
    this.moves.push(direction);
    const pushed = next.boxes.some((pos, index) => pos !== this.state.boxes[index]);
    this.state = next;
    if (pushed) this.deadlock = detectDeadlock(this.board, this.state, this.deadSquares);
    return true;
  }
  undo() {
    if (!this.history.length) return false;
    this.state = this.history.pop();
    this.moves.pop();
    this.deadlock = detectDeadlock(this.board, this.state, this.deadSquares);
    return true;
  }
}

export function score(steps, minimum) {
  if (!Number.isInteger(minimum) || minimum < 1) throw new Error('Missing verified minimum steps');
  return steps <= Math.ceil(minimum * 1.5) ? 3 : steps <= minimum * 2 ? 2 : 1;
}
