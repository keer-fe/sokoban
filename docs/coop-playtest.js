(() => {
  'use strict';
  const maps = globalThis.COOP_MAPS;
  const $ = id => document.getElementById(id);
  const directions = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  let level = 0, cells, width, players, boxes, goals, plates, history, counts;
  const completed = new Set();
  const won = () => boxes.every(p => goals.has(p));
  const occupied = p => players.includes(p) || boxes.includes(p);
  const doorOpen = ch => occupied(plates[ch.toLowerCase()]);
  function load(index) {
    level = index; width = maps[level][6][0].length;
    cells = maps[level][6].join('').split(''); players = [cells.indexOf('1'),cells.indexOf('2')];
    boxes = []; goals = new Set(); plates = {}; history = []; counts = [0,0];
    cells.forEach((c,p) => {if(c === '$') boxes.push(p); if(c === '.') goals.add(p); if(c === 'a' || c === 'b') plates[c] = p;});
    $('hint').open = false; $('answer').open = false;
    $('title').textContent = `${maps[level][0]} · ${maps[level][1]}`;
    $('theme').textContent = maps[level][3] + ' · 参考最短 ' + maps[level][2] + ' 步';
    $('intent').textContent = maps[level][4]; $('note').textContent = maps[level][5];
    $('solution').textContent = maps[level][7];
    render('把所有箱子推到 ◎，共同完成这一关。');
  }
  function neighbor(p, direction) {
    const [dx,dy] = directions[direction]; const x = p % width + dx, y = Math.floor(p / width) + dy;
    return x < 0 || x >= width || y < 0 || y >= cells.length / width ? -1 : y * width + x;
  }
  function passable(p) {
    if(p < 0 || p >= cells.length || cells[p] === '#') return false;
    return !['A','B'].includes(cells[p]) || doorOpen(cells[p]) || occupied(p);
  }
  function move(actor,direction) {
    if(won()) return false;
    const next = neighbor(players[actor],direction);
    if(!passable(next)) {render(['A','B'].includes(cells[next]) ? `门 ${cells[next]} 还没打开，让伙伴或箱子压住 ${cells[next].toLowerCase()}。` : '这里是墙，试试另一个方向。');return false;}
    if(next === players[1-actor]) {render('伙伴挡住了路，先互相让一让。');return false;}
    const box = boxes.indexOf(next), target = neighbor(next,direction);
    if(box !== -1 && (!passable(target) || occupied(target))) {render('箱子前方没有空位，换个站位试试。');return false;}
    history.push({players:[...players],boxes:[...boxes],counts:[...counts]});
    if(box !== -1) boxes[box] = target;
    players[actor] = next; counts[actor]++;
    if(won()) completed.add(level);
    render(won() ? `合作成功！共 ${history.length} 步，${level === maps.length-1 ? '最后一关完成！' : '试试下一关。'}` : `${actor+1} 号${box !== -1 ? '推动了箱子' : '移动了一步'}。`);
    return true;
  }
  function undo() {
    if(!history.length) return;
    ({players,boxes,counts} = history.pop()); render('已撤销双方最近的一步。');
  }
  function render(message) {
    $('board').style.gridTemplateColumns = `repeat(${width},minmax(0,1fr))`;
    $('board').replaceChildren();
    cells.forEach((ch,p) => {
      const tile = document.createElement('div'); tile.className = 'tile';
      const terrain = {'#':'wall','.':'goal',a:'plate',b:'plate',A:'door',B:'door'}[ch];
      if(terrain) tile.classList.add(terrain);
      let mark = ch === '.' ? '◎' : 'abAB'.includes(ch) ? ch : '';
      if(['A','B'].includes(ch) && doorOpen(ch)) tile.classList.add('open');
      tile.textContent = mark;
      const actor = players.indexOf(p), box = boxes.includes(p);
      if(actor !== -1 || box) {
        tile.textContent = '';
        const token = document.createElement('span'); token.className = 'token ' + (actor !== -1 ? `p${actor+1}` : 'box' + (goals.has(p) ? ' done' : ''));
        token.textContent = actor !== -1 ? String(actor+1) : goals.has(p) ? '✓' : '▣'; tile.append(token);
        if(mark) {const under = document.createElement('span');under.className = 'under';under.textContent = mark;tile.append(under);}
      }
      $('board').append(tile);
    });
    $('stats').textContent = `${history.length} 步 · 1号 ${counts[0]} / 2号 ${counts[1]}`;
    $('status').textContent = message; $('status').classList.toggle('win',won());
    $('undo').disabled = !history.length; $('next').disabled = level === maps.length-1;
    $('levels').replaceChildren();
    maps.forEach((m,i) => {const button = document.createElement('button');button.textContent = `${m[0]} ${m[1]}${completed.has(i) ? ' ✓' : ''}`;button.classList.toggle('active',i === level);button.setAttribute('aria-pressed',String(i === level));button.onclick = () => load(i);$('levels').append(button);});
  }
  document.querySelectorAll('[data-dir]').forEach(button => button.onclick = () => move(Number(button.closest('[data-actor]').dataset.actor),button.dataset.dir));
  $('undo').onclick = undo; $('restart').onclick = () => load(level); $('next').onclick = () => {if(level < maps.length-1) load(level+1);};
  const keys = {w:[0,'up'],a:[0,'left'],s:[0,'down'],d:[0,'right'],ArrowUp:[1,'up'],ArrowLeft:[1,'left'],ArrowDown:[1,'down'],ArrowRight:[1,'right']};
  window.addEventListener('keydown',event => {
    if(event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if(keys[key]) {event.preventDefault();move(...keys[key]);}
    else if(key === 'z') {event.preventDefault();undo();}
  });
  load(0);
})();
