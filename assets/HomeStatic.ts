import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame, Graphics, Label,
  view, ResolutionPolicy, Vec3, Rect, Size, Color, sys, resources, JsonAsset } from 'cc';

const { ccclass, property } = _decorator;
const WIDTH = 941;
const HEIGHT = 1672;
const TILE = 122.5;
const TILE_DRAW_WIDTH = 124;
const ROW_PITCH = 121.25;
const TILE_HEIGHT = 137;
const ORIGIN_X = 164;
const ORIGIN_Y = 561.5;

// # = wall, . = floor, p = player on floor, b = crate on floor,
// g = goal on floor. Every visible cell is a separate Cocos node.
const HOME_MAP = [
  '  #.  ',
  ' ....#',
  '#pbg.#',
  ' ...  ',
  '  #   ',
];

type Cell = { row: number; col: number; value: string };

const TILE_VARIANTS = [
  'floor-r0-c3', 'floor-r1-c1', 'floor-r1-c2', 'floor-r1-c3',
  'floor-r1-c4', 'floor-r2-c4', 'floor-r3-c1', 'floor-r3-c2',
  'floor-r3-c3', 'wall-r0-c2', 'wall-r1-c5', 'wall-r2-c0',
  'wall-r2-c5', 'wall-r4-c2',
] as const;
const GAME_WALLS = TILE_VARIANTS.filter(name => name.indexOf('wall-') === 0);

const IMAGE_NAMES = [
  'base', 'upper-glow', 'lower-glow', 'heading-glow',
  'edge-light', 'tile-shadow', 'floor-player',
  ...TILE_VARIANTS,
  'player', 'crate', 'goal', 'player-shadow', 'crate-shadow',
  'title', 'settings', 'friends', 'start-button',
  'level-button', 'leaderboard-button', 'floor-game',
] as const;

type Level = { rows: string[]; minSteps?: number };
const STORAGE = 'sokoban-current-challenge-v1';
const STATE_STORAGE = 'sokoban-challenge-state-v1';
type SavedGame = { index: number; board: string[]; steps: number };
// The first challenge follows the supplied game-screen artwork. Subsequent
// challenges are read from the bundled classic campaign.
const FIRST_LEVEL: Level = { rows: [
  '___# __', '_#  . #', '_    _#', '#  $__#', '#__ $ .', '_@    #', '_  ____',
] };

@ccclass('HomeStatic')
export class HomeStatic extends Component {
  @property([SpriteFrame])
  public images: SpriteFrame[] = [];

  private art = new Map<string, SpriteFrame>();
  private root!: Node;
  private mapLayer!: Node;
  private gameRoot!: Node;
  private levels: Level[] = [FIRST_LEVEL];
  private levelIndex = 0;
  private steps = 0;
  private board: string[][] = [];
  private history: { board: string[][]; steps: number }[] = [];
  private levelsReady = false;
  private pendingStart = false;

  start() {
    view.setDesignResolutionSize(WIDTH, HEIGHT, ResolutionPolicy.FIXED_WIDTH);
    const frame = view.getFrameSize();
    const screenHeight = WIDTH * frame.height / frame.width;
    const extraHeight = Math.max(0, screenHeight - HEIGHT);
    const headerLift = extraHeight * 0.35;
    const mapLift = extraHeight * 0.12;
    const startDrop = extraHeight * 0.2;
    const footerDrop = extraHeight * 0.35;
    this.root = new Node('Home composition');
    this.node.addChild(this.root);
    if (this.images.length !== IMAGE_NAMES.length || this.images.some(image => !image)) {
      throw new Error(`Home scene requires ${IMAGE_NAMES.length} assigned images`);
    }
    IMAGE_NAMES.forEach((name, index) => this.art.set(name, this.images[index]));

    this.draw(this.root, this.art.get('base')!, 'Cream background',
      WIDTH / 2, HEIGHT / 2,
      WIDTH, Math.max(HEIGHT, screenHeight));
    this.mapLayer = new Node('Data-driven map and lighting');
    this.root.addChild(this.mapLayer);
    this.mapLayer.setPosition(0, mapLift, 0);
    this.drawMap();

    this.draw(this.root, this.art.get('title')!,
      'Title and subtitle', 470, 277.5 - headerLift, 588, 303);
    this.draw(this.root, this.art.get('settings')!,
      'Settings shortcut', 107.5, 345 - headerLift, 173, 218);
    this.draw(this.root, this.art.get('friends')!,
      'Friends shortcut', 832.5, 345 - headerLift, 173, 218);
    const startButton = this.draw(this.root, this.art.get('start-button')!,
      'Start button', 470, 1255 + startDrop, 738, 308);
    startButton.on(Node.EventType.TOUCH_END, () => this.openGame());
    this.draw(this.root, this.art.get('level-button')!,
      'Choose level button', 260, 1490 + footerDrop, 428, 218);
    this.draw(this.root, this.art.get('leaderboard-button')!,
      'Leaderboard button', 680, 1490 + footerDrop, 428, 218);
    resources.load('levels/classic', JsonAsset, (error, asset) => {
      if (!error && asset && Array.isArray(asset.json?.levels)) {
        this.levels = [FIRST_LEVEL, ...asset.json.levels.slice(1)];
        this.levelsReady = true;
      } else {
        console.error('Classic levels could not be loaded', error);
      }
      if (this.pendingStart && this.levelsReady) this.openGame();
    });
  }

  private openGame() {
    if (this.gameRoot?.isValid) return;
    if (!this.levelsReady) {
      this.pendingStart = true;
      return;
    }
    this.pendingStart = false;
    this.root.active = false;
    this.levelIndex = Math.max(0, Math.min(this.levels.length - 1,
      Number(sys.localStorage.getItem(STORAGE) || 0) || 0));
    this.loadLevel(true);
  }

  private loadLevel(restore = false) {
    if (this.gameRoot?.isValid) this.gameRoot.destroy();
    this.gameRoot = new Node('Playable game page');
    this.node.addChild(this.gameRoot);
    this.board = this.levels[this.levelIndex].rows.map(row => row.split(''));
    this.steps = 0;
    this.history = [];
    if (restore) this.restoreGame();
    this.saveGame();
    this.renderGame();
  }

  private restoreGame() {
    try {
      const saved = JSON.parse(sys.localStorage.getItem(STATE_STORAGE) || 'null') as SavedGame | null;
      if (!saved || saved.index !== this.levelIndex || !Array.isArray(saved.board) ||
        saved.board.length !== this.board.length || !Number.isSafeInteger(saved.steps) || saved.steps < 0 ||
        saved.board.some((row, y) => typeof row !== 'string' || row.length !== this.board[y].length ||
          /[^#_ .$*@+]/.test(row))) return;
      const cells = saved.board.join('');
      if ((cells.match(/[@+]/g) || []).length !== 1) return;
      this.board = saved.board.map(row => row.split(''));
      this.steps = saved.steps;
    } catch (error) {
      console.warn('Ignoring invalid saved challenge', error);
    }
  }

  private saveGame() {
    sys.localStorage.setItem(STORAGE, String(this.levelIndex));
    sys.localStorage.setItem(STATE_STORAGE, JSON.stringify({
      index: this.levelIndex, board: this.board.map(row => row.join('')), steps: this.steps,
    } as SavedGame));
  }

  private renderGame() {
    this.gameRoot.children.slice().forEach(child => child.destroy());
    const g = this.gameRoot;
    const frame = view.getFrameSize();
    const screenHeight = WIDTH * frame.height / frame.width;
    const extraHeight = Math.max(0, screenHeight - HEIGHT);
    const headerLift = extraHeight * .35;
    const controlsDrop = extraHeight * .35;
    this.draw(g, this.art.get('base')!, 'Home palette background', WIDTH / 2, HEIGHT / 2,
      WIDTH, Math.max(HEIGHT, screenHeight));
    this.draw(g, this.art.get('upper-glow')!, 'Home palette upper light', 470, 590, 940, 1170);
    this.draw(g, this.art.get('lower-glow')!, 'Home palette lower light', 470, 1120, 940, 850);
    this.button(g, 'Back', 88, 79 - headerLift, 84, 77, '❮', 55, () => {
      this.saveGame();
      this.gameRoot.destroy();
      this.root.active = true;
    });
    this.label(g, `第 ${this.levelIndex + 1} 关`, 470, 77 - headerLift, 55, new Color(74, 75, 70), true);
    this.label(g, `步数 ${this.steps}`, 840, 79 - headerLift, 38, new Color(77, 78, 73), true);
    this.renderBoard(g);
    this.button(g, 'Up', 470, 1318 + controlsDrop, 120, 107, '▲', 47, () => this.move(0, -1));
    this.button(g, 'Left', 352, 1427 + controlsDrop, 120, 107, '◀', 45, () => this.move(-1, 0));
    this.button(g, 'Right', 588, 1427 + controlsDrop, 120, 107, '▶', 45, () => this.move(1, 0));
    this.button(g, 'Down', 470, 1533 + controlsDrop, 120, 107, '▼', 47, () => this.move(0, 1));
    this.button(g, 'Undo', 117, 1538 + controlsDrop, 144, 123, '↶', 80, () => this.undo());
    this.button(g, 'Hint', 824, 1538 + controlsDrop, 144, 123, '☼', 73, () => this.hint());
  }

  private renderBoard(parent: Node) {
    const rows = this.board.length;
    const cols = Math.max(...this.board.map(row => row.length));
    const size = Math.min(122, 810 / cols, 875 / rows);
    const x0 = (WIDTH - cols * size) / 2 + size / 2;
    const y0 = 345 + (7 - rows) * size / 2;
    const rowPitch = size * 1.075;
    const cells: { row: number; col: number; value: string; x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const value = this.board[row]?.[col] || '_';
      if (value === '_') continue;
      if (value === '#' && !this.showWall(row, col)) continue;
      const x = x0 + col * size, y = y0 + row * rowPitch;
      cells.push({ row, col, value, x, y });
    }
    // Keep every ground shadow underneath every stone. Interleaving these
    // draws darkens neighboring stone faces and creates uneven seams.
    for (const { row, col, x, y } of cells)
      this.draw(parent, this.art.get('tile-shadow')!, `Tile shadow ${row}:${col}`, x + 3, y + 8, size + 23, size + 23);
    for (const { row, col, value, x, y } of cells) {
      const wall = value === '#';
      const name = wall
        ? GAME_WALLS[this.tileVariant(row, col) % GAME_WALLS.length]
        : 'floor-game';
      const frame = this.art.get(name)!;
      this.draw(parent, frame, `Tile ${row}:${col}`, x, y,
        wall ? size + 8 : size + 20, wall ? rowPitch + 15 : rowPitch + 20);
    }
    for (const { row, col, value, x, y } of cells) {
      if (value === '.' || value === '*' || value === '+')
        this.draw(parent, this.art.get('goal')!, `Goal ${row}:${col}`, x, y - 2, size * .77, size * .77);
      if (value === '$' || value === '*') {
        this.draw(parent, this.art.get('crate-shadow')!, `Box shadow ${row}:${col}`, x, y + 5, size * 1.2, size * 1.2);
        this.draw(parent, this.art.get('crate')!, `Box ${row}:${col}`, x, y - 3, size * .88, size * .94);
      }
      if (value === '@' || value === '+') {
        this.draw(parent, this.art.get('player-shadow')!, `Player shadow ${row}:${col}`, x, y + 5, size * 1.1, size * 1.1);
        this.draw(parent, this.art.get('player')!, `Player ${row}:${col}`, x, y - 9, size * .69, size * .96);
      }
    }
  }

  private tileVariant(row: number, col: number) {
    let seed = ((this.levelIndex + 1) * 73856093) ^ (row * 19349663) ^ (col * 83492791);
    seed ^= seed >>> 13;
    seed = Math.imul(seed, 1274126177);
    return (seed ^ (seed >>> 16)) >>> 0;
  }

  private showWall(row: number, col: number) {
    const walkable = (y: number, x: number) => {
      const cell = this.board[y]?.[x];
      return !!cell && cell !== '#' && cell !== '_';
    };
    // Walls that divide two walkable cells are gameplay landmarks. Other
    // perimeter pieces are sparse decoration; the collision map stays intact.
    if ((walkable(row, col - 1) && walkable(row, col + 1)) ||
      (walkable(row - 1, col) && walkable(row + 1, col))) return true;
    if (!walkable(row, col - 1) && !walkable(row, col + 1) &&
      !walkable(row - 1, col) && !walkable(row + 1, col)) return false;
    return this.tileVariant(row, col) % 100 < 55;
  }

  private move(dx: number, dy: number) {
    let px = -1, py = -1;
    this.board.forEach((line, y) => line.forEach((v, x) => {
      if (v === '@' || v === '+') { px = x; py = y; }
    }));
    const next = this.board[py + dy]?.[px + dx];
    if (!next || next === '#' || next === '_') return;
    if (next === '$' || next === '*') {
      const beyond = this.board[py + dy * 2]?.[px + dx * 2];
      if (beyond !== ' ' && beyond !== '.') return;
    }
    this.history.push({ board: this.board.map(line => [...line]), steps: this.steps });
    this.board[py][px] = this.board[py][px] === '+' ? '.' : ' ';
    this.board[py + dy][px + dx] = next === '.' || next === '*' ? '+' : '@';
    if (next === '$' || next === '*') {
      const bx = px + dx * 2, by = py + dy * 2;
      this.board[by][bx] = this.board[by][bx] === '.' ? '*' : '$';
    }
    this.steps++;
    if (!this.board.some(line => line.indexOf('$') >= 0)) {
      this.levelIndex = Math.min(this.levelIndex + 1, this.levels.length - 1);
      this.loadLevel();
      return;
    }
    this.saveGame();
    this.renderGame();
  }

  private undo() {
    const state = this.history.pop();
    if (!state) return;
    this.board = state.board;
    this.steps = state.steps;
    this.saveGame();
    this.renderGame();
  }

  private hint() {
    const direction = this.findHint();
    const text = direction ? `提示：向${direction}` : '试着先靠近箱子';
    this.label(this.gameRoot, text, 470, 1218, 30, new Color(88, 89, 86), true);
  }

  private findHint(): string | null {
    const width = Math.max(...this.board.map(row => row.length));
    const floors = new Set<number>();
    const goals = new Set<number>();
    const boxes: number[] = [];
    let player = -1;
    this.board.forEach((row, y) => row.forEach((cell, x) => {
      const id = y * width + x;
      if (cell === '#' || cell === '_') return;
      floors.add(id);
      if (cell === '.' || cell === '*' || cell === '+') goals.add(id);
      if (cell === '$' || cell === '*') boxes.push(id);
      if (cell === '@' || cell === '+') player = id;
    }));
    if (player < 0 || boxes.length === 0) return null;
    const directions = [
      { dx: 0, dy: -1, name: '上' }, { dx: -1, dy: 0, name: '左' },
      { dx: 1, dy: 0, name: '右' }, { dx: 0, dy: 1, name: '下' },
    ];
    type SearchState = { player: number; boxes: number[]; first: string };
    const queue: SearchState[] = [{ player, boxes: boxes.sort((a, b) => a - b), first: '' }];
    const seen = new Set<string>([`${player}|${boxes.join(',')}`]);
    for (let head = 0; head < queue.length && head < 30000; head++) {
      const state = queue[head];
      const occupied = new Set(state.boxes);
      for (const direction of directions) {
        const x = state.player % width + direction.dx;
        const y = Math.floor(state.player / width) + direction.dy;
        const next = y * width + x;
        if (x < 0 || x >= width || y < 0 || !floors.has(next)) continue;
        let moved = state.boxes;
        if (occupied.has(next)) {
          const beyondX = x + direction.dx;
          const beyond = (y + direction.dy) * width + beyondX;
          if (beyondX < 0 || beyondX >= width || !floors.has(beyond) || occupied.has(beyond)) continue;
          moved = state.boxes.map(box => box === next ? beyond : box).sort((a, b) => a - b);
          if (moved.every(box => goals.has(box))) return state.first || direction.name;
        }
        const key = `${next}|${moved.join(',')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ player: next, boxes: moved, first: state.first || direction.name });
      }
    }
    return null;
  }

  private label(parent: Node, text: string, x: number, y: number, fontSize: number, color: Color, bold = false) {
    const node = new Node(text);
    parent.addChild(node);
    node.setPosition(this.pos(x, y));
    node.addComponent(UITransform).setContentSize(360, fontSize * 1.4);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize * 1.2;
    label.color = color;
    label.isBold = bold;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    return node;
  }

  private button(parent: Node, name: string, x: number, y: number, width: number, height: number,
    symbol: string, fontSize: number, action: () => void) {
    const shadow = this.draw(parent, this.art.get('tile-shadow')!, `${name} soft shadow`,
      x, y + 16, width + 72, height + 65);
    shadow.getComponent(Sprite)!.color = new Color(255, 255, 255, 75);
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(this.pos(x, y));
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(108, 115, 103, 105);
    graphics.roundRect(-width / 2, -height / 2 - 9, width, height, 22);
    graphics.fill();
    graphics.fillColor = new Color(246, 247, 241);
    graphics.roundRect(-width / 2, -height / 2, width, height, 22);
    graphics.fill();
    graphics.strokeColor = new Color(255, 255, 255, 235);
    graphics.lineWidth = 2;
    graphics.roundRect(-width / 2, -height / 2, width, height, 22);
    graphics.stroke();
    if (name === 'Undo' || name === 'Hint') this.drawActionIcon(node, name);
    else if (name === 'Up' || name === 'Left' || name === 'Right' || name === 'Down')
      this.drawDirectionIcon(node, name);
    else this.label(node, symbol, WIDTH / 2, HEIGHT / 2 + 4, fontSize, new Color(88, 89, 86), true);
    node.on(Node.EventType.TOUCH_END, action);
  }

  private drawDirectionIcon(node: Node, direction: string) {
    const icon = new Node(`${direction} icon`);
    node.addChild(icon);
    const g = icon.addComponent(Graphics);
    g.fillColor = new Color(88, 89, 86);
    const points: Record<string, [number, number][]> = {
      Up: [[0, 19], [-24, -15], [24, -15]],
      Down: [[0, -19], [-24, 15], [24, 15]],
      Left: [[-19, 0], [15, 24], [15, -24]],
      Right: [[19, 0], [-15, 24], [-15, -24]],
    };
    const vertices = points[direction];
    // Soft, slightly rounded corners follow the reference's carved icons.
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i + 2) % 3];
      const point = vertices[i];
      const next = vertices[(i + 1) % 3];
      const entryX = point[0] * .82 + prev[0] * .18;
      const entryY = point[1] * .82 + prev[1] * .18;
      const exitX = point[0] * .82 + next[0] * .18;
      const exitY = point[1] * .82 + next[1] * .18;
      if (i === 0) g.moveTo(entryX, entryY);
      else g.lineTo(entryX, entryY);
      g.bezierCurveTo(point[0], point[1], point[0], point[1], exitX, exitY);
    }
    const first = vertices[0], last = vertices[2];
    g.lineTo(first[0] * .82 + last[0] * .18, first[1] * .82 + last[1] * .18);
    g.close();
    g.fill();
  }

  private drawActionIcon(node: Node, name: string) {
    const icon = new Node(`${name} icon`);
    node.addChild(icon);
    const g = icon.addComponent(Graphics);
    g.strokeColor = new Color(88, 89, 86);
    g.fillColor = new Color(88, 89, 86);
    g.lineWidth = 7;
    if (name === 'Undo') {
      g.moveTo(-25, 12);
      g.lineTo(4, 12);
      g.bezierCurveTo(27, 12, 35, -1, 35, -12);
      g.bezierCurveTo(35, -28, 23, -33, 7, -33);
      g.lineTo(-13, -33);
      g.stroke();
      g.moveTo(-41, 12);
      g.lineTo(-19, 32);
      g.lineTo(-19, -8);
      g.lineTo(-41, 12);
      g.fill();
    } else {
      g.moveTo(-15, -8);
      g.bezierCurveTo(-22, -2, -24, 5, -24, 13);
      g.bezierCurveTo(-24, 27, -14, 36, 0, 36);
      g.bezierCurveTo(14, 36, 24, 27, 24, 13);
      g.bezierCurveTo(24, 5, 22, -2, 15, -8);
      g.lineTo(13, -16);
      g.lineTo(-13, -16);
      g.close(); g.fill();
      g.roundRect(-13, -24, 26, 7, 3); g.fill();
      g.roundRect(-7, -33, 14, 6, 3); g.fill();
      [[0, 48, 0, 57], [-34, 39, -41, 46], [34, 39, 41, 46],
        [-38, 11, -48, 11], [38, 11, 48, 11]].forEach(([x1, y1, x2, y2]) => {
        g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        g.circle(x1, y1, 3.5); g.fill();
        g.circle(x2, y2, 3.5); g.fill();
      });
    }
  }

  private drawMap() {
    const cells: Cell[] = [];
    HOME_MAP.forEach((line, row) => line.split('').forEach((value, col) => {
      if (value !== ' ') cells.push({ row, col, value });
    }));

    const columns = cells.map(cell => cell.col);
    const lines = cells.map(cell => cell.row);
    const minX = ORIGIN_X + Math.min(...columns) * TILE - TILE / 2;
    const maxX = ORIGIN_X + Math.max(...columns) * TILE + TILE / 2;
    const minY = ORIGIN_Y + Math.min(...lines) * ROW_PITCH - TILE_HEIGHT / 2;
    const maxY = ORIGIN_Y + Math.max(...lines) * ROW_PITCH + TILE_HEIGHT / 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // Lighting and tile shadows follow the map cells.
    const upperGlow = this.art.get('upper-glow')!;
    this.draw(this.mapLayer, upperGlow, 'Map-dependent upper sage glow',
      centerX - 40, minY + 325, maxX - minX + 520, 750);
    const headingGlow = this.art.get('heading-glow')!;
    this.draw(this.mapLayer, headingGlow, 'Map-dependent upper-center shade',
      centerX, minY + 25, 900, 500);
    const lowerGlow = this.art.get('lower-glow')!;
    const lowerGlowNode = this.draw(this.mapLayer, lowerGlow, 'Map-dependent lower sage glow',
      centerX, maxY - 110, maxX - minX + 100, 700);
    lowerGlowNode.getComponent(Sprite)!.color = new Color(255, 255, 255, 180);
    this.draw(this.mapLayer, this.art.get('edge-light')!,
      'Map-dependent left ambient light', minX - 113, centerY, 400, 800);
    const rightAmbient = this.draw(this.mapLayer, this.art.get('edge-light')!,
      'Map-dependent right ambient light', maxX + 110, centerY, 200, 800);
    rightAmbient.getComponent(Sprite)!.color = new Color(255, 255, 255, 190);

    const shadow = this.crop(this.art.get('tile-shadow')!, 0, 0, 512, 512);
    cells.forEach(({ row, col }) => {
      const shadowNode = this.draw(this.mapLayer, shadow,
        `Shadow ${row}:${col}`, this.x(col) - 6, this.y(row) + 15, 390, 350);
      shadowNode.getComponent(Sprite)!.color = new Color(255, 255, 255, 220);
    });

    cells.forEach(({ row, col, value }) => {
      this.drawTile(value, row, col);
    });

    cells.forEach(({ row, col, value }) => {
      const x = this.x(col);
      const y = this.y(row);
      if (value === 'p') this.draw(this.mapLayer,
        this.art.get('player-shadow')!, 'Player contact shadow',
        x + 5, y - 4, 160, 160);
      if (value === 'b') this.draw(this.mapLayer,
        this.art.get('crate-shadow')!, 'Crate contact shadow',
        x + 2, y - 4, 160, 160);
    });

    cells.forEach(({ row, col, value }) => {
      const x = this.x(col);
      const y = this.y(row);
      if (value === 'g') {
        this.draw(this.mapLayer, this.art.get('goal')!,
          'Goal', x + 1, y - 3, 91, 90);
      }
      if (value === 'b') this.draw(this.mapLayer, this.art.get('crate')!,
        'Crate', x + 2, y - 4, 106, 114);
      if (value === 'p') this.draw(this.mapLayer, this.art.get('player')!,
        'Player', x + 5.5, y - 8.5, 78, 113);
    });

  }

  private x(col: number) { return ORIGIN_X + col * TILE; }
  private y(row: number) { return ORIGIN_Y + row * ROW_PITCH; }

  private drawTile(value: string, row: number, col: number) {
    const wall = value === '#';
    const tileName = value === 'p' ? 'floor-player'
      : value === 'b' ? 'floor-r1-c1'
      : value === 'g' ? 'floor-r1-c3'
      : `${wall ? 'wall' : 'floor'}-r${row}-c${col}`;
    const frame = this.art.get(tileName)!;
    this.draw(this.mapLayer, frame,
      `${wall ? 'Stone wall' : 'Cream floor'} ${row}:${col}`,
      this.x(col), this.y(row) + (wall ? 2.5 : 2), TILE_DRAW_WIDTH, 138);
  }

  private pos(x: number, y: number) {
    return new Vec3(x - WIDTH / 2, HEIGHT / 2 - y, 0);
  }

  private crop(source: SpriteFrame, x: number, y: number, width: number, height: number) {
    const frame = new SpriteFrame();
    frame.reset({ texture: source.texture, rect: new Rect(x, y, width, height),
      originalSize: new Size(width, height) });
    return frame;
  }

  private draw(parent: Node, frame: SpriteFrame, name: string,
    x: number, y: number, width: number, height: number) {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(this.pos(x, y));
    const transform = node.addComponent(UITransform);
    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = frame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    transform.setContentSize(width, height);
    return node;
  }
}
