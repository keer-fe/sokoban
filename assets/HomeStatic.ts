import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame,
  view, screen, ResolutionPolicy, Vec3, Rect, Size, Color } from 'cc';

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

const IMAGE_NAMES = [
  'base', 'upper-glow', 'lower-glow', 'heading-glow',
  'edge-light', 'tile-shadow', 'floor-player',
  ...TILE_VARIANTS,
  'player', 'crate', 'goal', 'player-shadow', 'crate-shadow',
  'title', 'settings', 'friends', 'start-button',
  'level-button', 'leaderboard-button',
] as const;

@ccclass('HomeStatic')
export class HomeStatic extends Component {
  @property([SpriteFrame])
  public images: SpriteFrame[] = [];

  private art = new Map<string, SpriteFrame>();
  private root!: Node;
  private mapLayer!: Node;

  start() {
    const frame = screen.windowSize;
    const portraitIsTaller = frame.width / frame.height < WIDTH / HEIGHT;
    view.setDesignResolutionSize(WIDTH, HEIGHT,
      portraitIsTaller ? ResolutionPolicy.FIXED_WIDTH : ResolutionPolicy.FIXED_HEIGHT);
    const visible = view.getVisibleSize();
    const extraHeight = Math.max(0, visible.height - HEIGHT);
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
      Math.max(WIDTH, visible.width), Math.max(HEIGHT, visible.height));
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
    this.draw(this.root, this.art.get('start-button')!,
      'Start button', 470, 1255 + startDrop, 738, 308);
    this.draw(this.root, this.art.get('level-button')!,
      'Choose level button', 260, 1490 + footerDrop, 428, 218);
    this.draw(this.root, this.art.get('leaderboard-button')!,
      'Leaderboard button', 680, 1490 + footerDrop, 428, 218);
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
