// Replay every published solution through the actual page handlers, with a tiny
// DOM adapter. This checks UI/state integration; browser rendering is checked separately.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..', 'docs');
class Element {
  constructor() {
    this.children = []; this.textContent = ''; this.style = {}; this.dataset = {};
    this.attributes = {}; this.classes = new Set(); this.className = '';
    this.classList = {add: c => this.classes.add(c), toggle: (c, value) => value ? this.classes.add(c) : this.classes.delete(c)};
  }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  setAttribute(k,v) { this.attributes[k] = v; }
  scrollIntoView() {}
}
const ids = Object.fromEntries([...fs.readFileSync(path.join(root,'coop-playtest.html'),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const controls = [0,1].flatMap(actor => ['up','down','left','right'].map(dir => {
  const el = new Element(); el.dataset.dir = dir; el.closest = () => ({dataset:{actor}}); return el;
}));
let keyHandler;
const context = vm.createContext({document:{
  getElementById:id=>{assert.ok(ids[id],`Missing HTML element ${id}`);return ids[id];},
  createElement:()=>new Element(), querySelectorAll:()=>controls,
},window:{addEventListener:(type,fn)=>{assert.equal(type,'keydown');keyHandler=fn;}}});
for(const file of ['coop-level-data.js','coop-playtest.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const maps = context.COOP_MAPS;
assert.equal(maps.length,20,'Chapter must contain 20 levels');
assert.equal(new Set(maps.map(m=>m[6].join('\n'))).size,20,'Duplicate layouts');
const keys = {'1↑':'w','1↓':'s','1←':'a','1→':'d','2↑':'ArrowUp','2↓':'ArrowDown','2←':'ArrowLeft','2→':'ArrowRight'};
const press = key => keyHandler({key,target:{tagName:'BODY'},preventDefault(){}});
const steps = () => Number(ids.stats.textContent.split(' ')[0]);
const snapshot = () => JSON.stringify(ids.board.children.map(t=>({text:t.textContent,classes:[...t.classes],tokens:t.children.map(c=>[c.textContent,c.className])})));
const win = () => ids.status.classes.has('win');
for(let i=0;i<maps.length;i++) {
  ids.levels.children[i].onclick();
  const before = snapshot(); assert.equal(steps(),0); assert.equal(ids.undo.disabled,true);
  const moves = maps[i][7].split(' '); assert.equal(moves.length,maps[i][2]);
  moves.forEach((m,j)=>{assert.ok(keys[m]);press(keys[m]);assert.equal(steps(),j+1,`Blocked move ${j+1} in level ${i+1}`);});
  assert.equal(win(),true,`Level ${i+1} did not finish`);
  const after = snapshot(); press('w'); assert.equal(snapshot(),after,'Moves after completion');
  press('z'); assert.equal(win(),false);assert.equal(steps(),moves.length-1);
  press(keys[moves.at(-1)]);assert.equal(snapshot(),after,'Undo/replay mismatch');
  for(let j=0;j<moves.length;j++) press('z');
  assert.equal(snapshot(),before,'Full undo must restore start');
  ids.restart.onclick();assert.equal(snapshot(),before,'Restart must restore start');
  console.log(`PASS ${maps[i][0]} ${maps[i][1]}: ${moves.length} moves, completion, undo, restart`);
}
assert.equal(ids.next.disabled,true);ids.next.onclick();assert.match(ids.title.textContent,/20/);
ids.levels.children[0].onclick();
press('w');assert.equal(steps(),0,'Wall must block');
press('s');press('s');const collision=snapshot();press('d');assert.equal(snapshot(),collision,'Players cannot overlap');
ids.restart.onclick();
press('ArrowUp');press('ArrowRight');const closed=snapshot();press('ArrowRight');assert.equal(snapshot(),closed,'Closed door must block');
ids.restart.onclick();controls.find(el=>el.dataset.dir==='right' && el.closest().dataset.actor===0).onclick();assert.equal(steps(),1,'Touch button must move');
press('d');assert.ok(ids.board.children.some(t=>t.classes.has('door')&&t.classes.has('open')));
press('z');assert.ok(!ids.board.children.some(t=>t.classes.has('open')),'Leaving plate closes door');
assert.match(ids['chapter-progress'].textContent,/20 \/ 20/);
console.log('PASS input controls, walls, actor collision, closed/open doors, chapter boundary and progress');
