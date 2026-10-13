const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function neighbor(board, pos, dx, dy) {
  const x = pos % board.width + dx;
  const y = Math.floor(pos / board.width) + dy;
  return x >= 0 && x < board.width && y >= 0 && y < board.height ? y * board.width + x : -1;
}

// Reverse pushes from every goal, ignoring other boxes and player accessibility.
// If even this relaxed problem cannot reach a square, a box there cannot be saved.
export function findDeadSquares(board) {
  const reachable = new Set(board.goals);
  const queue = [...reachable];
  for (let i = 0; i < queue.length; i += 1) {
    for (const [dx, dy] of offsets) {
      const previous = neighbor(board, queue[i], dx, dy);
      const standing = neighbor(board, queue[i], dx * 2, dy * 2);
      if (board.floors.has(previous) && board.floors.has(standing) && !reachable.has(previous)) {
        reachable.add(previous);
        queue.push(previous);
      }
    }
  }
  return new Set([...board.floors].filter(pos => !reachable.has(pos)));
}

// Sufficient conditions only: no result does not prove that a position is solvable.
export function detectDeadlock(board, state, deadSquares = findDeadSquares(board)) {
  const stranded = state.boxes.filter(pos => deadSquares.has(pos));
  if (stranded.length) return { kind: 'dead-square', boxes: stranded };
  const boxes = new Set(state.boxes);
  for (const pos of boxes) {
    for (const dx of [-1, 1]) {
      for (const dy of [-1, 1]) {
        const square = [pos, neighbor(board, pos, dx, 0), neighbor(board, pos, 0, dy), neighbor(board, pos, dx, dy)];
        if (square.every(cell => !board.floors.has(cell) || boxes.has(cell))) {
          const trapped = square.filter(cell => boxes.has(cell) && !board.goals.has(cell));
          if (trapped.length) return { kind: 'blocked-square', boxes: trapped };
        }
      }
    }
  }
  return null;
}
