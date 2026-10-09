const config = require("./config");
const levelPack = require("./levels");
const storage = require("./storage");
const engine = require("./engine");

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const system = wx.getSystemInfoSync();
const dpr = system.pixelRatio || 1;

canvas.width = system.windowWidth * dpr;
canvas.height = system.windowHeight * dpr;
ctx.scale(dpr, dpr);

const view = {
  width: system.windowWidth,
  height: system.windowHeight,
  safeTop: 20,
  buttons: [],
  screen: "loading",
  overlay: null,
  toast: "",
  toastUntil: 0,
  board: null
};

try {
  const menu = wx.getMenuButtonBoundingClientRect();
  view.safeTop = Math.max(system.statusBarHeight || 20, menu.bottom + 8);
} catch (err) {
  view.safeTop = (system.statusBarHeight || 20) + 16;
}

let save = storage.readSave();
let state = null;
let currentLevel = null;
let completion = null;

function getLevel(levelId) {
  return levelPack.levels.find((item) => item.id === levelId) || levelPack.levels[0];
}

function clampProgress() {
  if (save.currentLevelId > levelPack.enabledLevelCount) {
    save.currentLevelId = levelPack.enabledLevelCount;
  }
  save.maxUnlockedLevelId = Math.max(1, Math.min(save.maxUnlockedLevelId || 1, levelPack.enabledLevelCount));
}

function startLevel(levelId) {
  currentLevel = getLevel(levelId);
  state = engine.createState(currentLevel);
  completion = null;
  view.screen = "game";
  view.overlay = null;
}

function restartLevel() {
  if (!currentLevel) return;
  state = engine.createState(currentLevel);
  view.overlay = null;
  toast("已重新开始");
}

function completeLevel() {
  const stars = engine.starsFor(currentLevel, state.steps);
  const oldStars = save.levelStars[String(currentLevel.id)] || 0;
  save.levelStars[String(currentLevel.id)] = Math.max(oldStars, stars);

  if (currentLevel.id >= levelPack.enabledLevelCount) {
    save.currentLevelId = levelPack.enabledLevelCount;
    save.maxUnlockedLevelId = levelPack.enabledLevelCount;
  } else {
    save.currentLevelId = currentLevel.id + 1;
    save.maxUnlockedLevelId = Math.max(save.maxUnlockedLevelId || 1, currentLevel.id + 1);
  }
  storage.writeSave(save);

  completion = { stars, steps: state.steps, isLast: currentLevel.id >= levelPack.enabledLevelCount };
  view.overlay = "complete";
}

function tryMove(dir) {
  if (view.screen !== "game" || view.overlay) return;
  const result = engine.move(state, dir);
  if (result.type === "blocked") {
    toast("走不通");
    return;
  }
  if (result.type === "completed") completeLevel();
}

function tryUndo() {
  if (view.screen !== "game" || view.overlay) return;
  if (!state.undoStack.length) {
    toast("暂无可撤销步骤");
    return;
  }
  if (save.undoCards <= 0) {
    view.overlay = "undoAd";
    return;
  }
  if (engine.undo(state)) {
    save.undoCards -= 1;
    storage.writeSave(save);
    toast("已撤销");
  }
}

function claimCheckin() {
  const today = storage.todayKey();
  if (save.lastCheckinDate === today) {
    toast("今日已领取");
    view.overlay = null;
    return;
  }
  save.lastCheckinDate = today;
  save.undoCards += config.dailyCheckinUndoCards;
  storage.writeSave(save);
  view.overlay = null;
  toast("已领取撤销卡 x5");
}

function grantAdReward() {
  save.undoCards += config.rewardAdUndoCards;
  storage.writeSave(save);
  view.overlay = null;
  toast("获得撤销卡 x3");
}

function toast(message) {
  view.toast = message;
  view.toastUntil = Date.now() + 1400;
}

function addButton(id, x, y, w, h, label, variant) {
  view.buttons.push({ id, x, y, w, h, label, variant: variant || "default" });
}

function fillRoundRect(x, y, w, h, r, color) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawText(text, x, y, size, color, align, weight) {
  ctx.fillStyle = color || "#2f3640";
  ctx.font = `${weight || 500} ${size}px sans-serif`;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawButton(button) {
  const palette = {
    primary: ["#2f9e74", "#ffffff"],
    default: ["#ffffff", "#2f3640"],
    subtle: ["#eef2f5", "#4b5563"],
    danger: ["#e8590c", "#ffffff"],
    icon: ["#ffffff", "#2f3640"]
  };
  const [bg, fg] = palette[button.variant] || palette.default;
  fillRoundRect(button.x, button.y, button.w, button.h, 8, bg);
  ctx.strokeStyle = button.variant === "default" || button.variant === "icon" ? "#d3dae2" : bg;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1, button.h >= 56 ? 20 : 16, fg, "center", 700);
}

function drawHome() {
  const w = view.width;
  const h = view.height;
  const today = storage.todayKey();
  const canCheckin = save.lastCheckinDate !== today;

  addButton("homeMenu", 12, view.safeTop - 38, 44, 44, "⚙", "icon");

  drawText(config.productName, w / 2, view.safeTop + 74, 40, "#1f2933", "center", 800);
  drawText(`第 ${save.currentLevelId} / ${config.totalLevelCount} 关`, w / 2, view.safeTop + 124, 18, "#607080", "center", 600);

  const sceneX = w / 2 - 120;
  const sceneY = view.safeTop + 170;
  fillRoundRect(sceneX, sceneY + 64, 240, 86, 8, "#d8eadf");
  drawCrate(sceneX + 128, sceneY + 42, 76, true);
  drawPlayer(sceneX + 72, sceneY + 60, 38);
  drawArrow(sceneX + 192, sceneY + 98, "#2f9e74");

  addButton("start", 42, h - 150, w - 84, 62, "开始游戏", "primary");
  addButton("checkin", w - 76, h - 238, 56, 56, "签", "danger");
  if (canCheckin) {
    ctx.beginPath();
    ctx.arc(w - 24, h - 232, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ff3b30";
    ctx.fill();
  }

  drawText("前 20 关已开放", w / 2, h - 62, 14, "#8a96a3", "center", 500);
}

function drawGame() {
  const w = view.width;
  const h = view.height;
  const top = view.safeTop;

  drawText(`第 ${currentLevel.id} 关`, 20, top - 18, 20, "#1f2933", "left", 800);
  drawText(`撤销卡 x${save.undoCards}`, w / 2, top - 18, 16, "#53616f", "center", 700);
  addButton("menu", w - 64, top - 40, 48, 44, "≡", "icon");

  drawBoard(20, top + 18, w - 40, h - top - 238);

  const keySize = Math.min(64, Math.floor((w - 120) / 4));
  const gap = 10;
  const cx = w / 2;
  const y = h - 166;
  addButton("up", cx - keySize / 2, y, keySize, keySize, "↑", "subtle");
  addButton("left", cx - keySize - gap - keySize / 2, y + keySize + gap, keySize, keySize, "←", "subtle");
  addButton("down", cx - keySize / 2, y + keySize + gap, keySize, keySize, "↓", "subtle");
  addButton("right", cx + keySize / 2 + gap, y + keySize + gap, keySize, keySize, "→", "subtle");
  addButton("undo", Math.max(20, cx - keySize * 2.6 - gap), y + keySize + gap, keySize + 10, keySize, "撤销", "default");
}

function drawLoading() {
  drawText(config.productName, view.width / 2, view.height / 2 - 28, 34, "#1f2933", "center", 800);
  drawText("加载中", view.width / 2, view.height / 2 + 22, 17, "#607080", "center", 600);
}

function drawBoard(x, y, maxW, maxH) {
  const level = currentLevel;
  const cell = Math.floor(Math.min(maxW / level.width, maxH / level.height));
  const boardW = cell * level.width;
  const boardH = cell * level.height;
  const startX = Math.floor(x + (maxW - boardW) / 2);
  const startY = Math.floor(y + (maxH - boardH) / 2);
  view.board = { x: startX, y: startY, cell };

  fillRoundRect(startX - 8, startY - 8, boardW + 16, boardH + 16, 8, "#c8d8d2");

  for (let row = 0; row < level.height; row += 1) {
    for (let col = 0; col < level.width; col += 1) {
      const cellX = startX + col * cell;
      const cellY = startY + row * cell;
      const value = level.grid[row][col];
      if (value === 0) continue;
      drawTile(cellX, cellY, cell, value);
    }
  }

  state.boxes.forEach((box) => {
    drawCrate(startX + box.col * cell + cell / 2, startY + box.row * cell + cell / 2, cell * 0.8, Boolean(state.targets[engine.keyOf(box)]));
  });
  drawPlayer(startX + state.player.col * cell + cell / 2, startY + state.player.row * cell + cell / 2, cell * 0.38);
}

function drawTile(x, y, size, value) {
  ctx.fillStyle = value === engine.WALL ? "#6f7d88" : "#f3e7c8";
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  if (value === engine.WALL) {
    ctx.fillStyle = "#82909a";
    ctx.fillRect(x + 2, y + 2, size - 4, Math.max(3, size * 0.16));
    return;
  }
  if (value === engine.TARGET || value === engine.BOX_ON_TARGET) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.23, 0, Math.PI * 2);
    ctx.fillStyle = "#68b984";
    ctx.fill();
  }
}

function drawCrate(cx, cy, size, settled) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  fillRoundRect(x, y, size, size, 6, settled ? "#50b66a" : "#c97935");
  ctx.strokeStyle = settled ? "#2f8c45" : "#8a4f24";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.strokeRect(x + size * 0.18, y + size * 0.18, size * 0.64, size * 0.64);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.2);
  ctx.lineTo(x + size * 0.8, y + size * 0.8);
  ctx.moveTo(x + size * 0.8, y + size * 0.2);
  ctx.lineTo(x + size * 0.2, y + size * 0.8);
  ctx.stroke();
}

function drawPlayer(cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#4c6ef5";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - radius * 0.32, cy - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.arc(cx + radius * 0.32, cy - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function drawArrow(cx, cy, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx + 24, cy);
  ctx.lineTo(cx, cy - 16);
  ctx.lineTo(cx, cy - 6);
  ctx.lineTo(cx - 24, cy - 6);
  ctx.lineTo(cx - 24, cy + 6);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx, cy + 16);
  ctx.closePath();
  ctx.fill();
}

function drawOverlay() {
  if (!view.overlay) return;

  ctx.fillStyle = "rgba(23, 31, 38, 0.52)";
  ctx.fillRect(0, 0, view.width, view.height);

  const x = 28;
  const w = view.width - 56;
  const y = Math.max(130, view.height / 2 - 178);
  fillRoundRect(x, y, w, 310, 8, "#ffffff");

  if (view.overlay === "menu") drawMenuOverlay(x, y, w);
  if (view.overlay === "settings") drawSettingsOverlay(x, y, w);
  if (view.overlay === "checkin") drawCheckinOverlay(x, y, w);
  if (view.overlay === "undoAd") drawUndoAdOverlay(x, y, w);
  if (view.overlay === "complete") drawCompleteOverlay(x, y, w);
}

function drawSettingsOverlay(x, y, w) {
  drawText("设置", x + w / 2, y + 48, 24, "#1f2933", "center", 800);
  addButton("toggleMusic", x + 28, y + 96, w - 56, 48, `音乐 ${save.musicEnabled ? "开" : "关"}`, "subtle");
  addButton("toggleSound", x + 28, y + 158, w - 56, 48, `音效 ${save.soundEnabled ? "开" : "关"}`, "subtle");
  addButton("closeOverlay", x + 28, y + 238, w - 56, 46, "关闭", "primary");
}

function drawMenuOverlay(x, y, w) {
  drawText("菜单", x + w / 2, y + 38, 24, "#1f2933", "center", 800);
  addButton("resume", x + 28, y + 74, w - 56, 46, "继续游戏", "primary");
  addButton("restart", x + 28, y + 132, w - 56, 46, "重新开始", "default");
  addButton("toggleMusic", x + 28, y + 190, (w - 68) / 2, 46, `音乐 ${save.musicEnabled ? "开" : "关"}`, "subtle");
  addButton("toggleSound", x + 40 + (w - 68) / 2, y + 190, (w - 68) / 2, 46, `音效 ${save.soundEnabled ? "开" : "关"}`, "subtle");
  addButton("home", x + 28, y + 248, w - 56, 46, "返回首页", "default");
}

function drawCheckinOverlay(x, y, w) {
  const claimed = save.lastCheckinDate === storage.todayKey();
  drawText("每日签到", x + w / 2, y + 48, 24, "#1f2933", "center", 800);
  drawText(claimed ? "今日已领取" : "今日奖励：撤销卡 x5", x + w / 2, y + 104, 18, "#53616f", "center", 600);
  addButton(claimed ? "closeOverlay" : "claimCheckin", x + 28, y + 174, w - 56, 52, claimed ? "知道了" : "领取", "primary");
  addButton("closeOverlay", x + 28, y + 238, w - 56, 46, "稍后", "default");
}

function drawUndoAdOverlay(x, y, w) {
  drawText("撤销卡不足", x + w / 2, y + 42, 24, "#1f2933", "center", 800);
  drawText("观看广告可获得 3 张撤销卡", x + w / 2, y + 88, 17, "#53616f", "center", 600);
  addButton("adSuccess", x + 28, y + 126, w - 56, 46, "完整观看", "primary");
  addButton("adEarlyClose", x + 28, y + 184, (w - 68) / 2, 44, "中途退出", "default");
  addButton("adFail", x + 40 + (w - 68) / 2, y + 184, (w - 68) / 2, 44, "加载失败", "default");
  addButton("closeOverlay", x + 28, y + 244, w - 56, 44, "取消", "subtle");
}

function drawCompleteOverlay(x, y, w) {
  const title = completion && completion.isLast ? "全部通关" : "通关成功";
  drawText(title, x + w / 2, y + 42, 24, "#1f2933", "center", 800);
  if (completion && completion.isLast) {
    drawText("已完成当前全部关卡", x + w / 2, y + 96, 18, "#53616f", "center", 600);
    drawText("更多地图和玩法正在开发中", x + w / 2, y + 126, 16, "#8a96a3", "center", 500);
  } else {
    drawText("★".repeat(completion.stars), x + w / 2, y + 94, 34, "#f59f00", "center", 800);
    drawText(`本次使用 ${completion.steps} 步`, x + w / 2, y + 140, 18, "#53616f", "center", 600);
  }
  addButton(completion && completion.isLast ? "home" : "nextLevel", x + 28, y + 190, w - 56, 52, completion && completion.isLast ? "返回首页" : "下一关", "primary");
  if (!(completion && completion.isLast)) addButton("home", x + 28, y + 254, w - 56, 42, "返回首页", "default");
}

function drawToast() {
  if (!view.toast || Date.now() > view.toastUntil) return;
  const w = Math.min(view.width - 80, Math.max(150, view.toast.length * 18 + 40));
  fillRoundRect((view.width - w) / 2, view.safeTop + 6, w, 40, 8, "rgba(31,41,51,0.88)");
  drawText(view.toast, view.width / 2, view.safeTop + 27, 15, "#ffffff", "center", 600);
}

function render() {
  view.buttons = [];
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = "#eaf5f1";
  ctx.fillRect(0, 0, view.width, view.height);

  if (view.screen === "loading") drawLoading();
  if (view.screen === "home") drawHome();
  if (view.screen === "game") drawGame();

  const baseButtonCount = view.buttons.length;
  view.buttons.forEach(drawButton);
  drawOverlay();
  view.buttons.slice(baseButtonCount).forEach(drawButton);
  drawToast();
  requestAnimationFrame(render);
}

function handleButton(id) {
  if (id === "start") return startLevel(save.currentLevelId);
  if (id === "checkin") {
    view.overlay = "checkin";
    return;
  }
  if (id === "homeMenu") {
    view.overlay = "settings";
    return;
  }
  if (id === "menu") {
    view.overlay = "menu";
    return;
  }
  if (id === "resume" || id === "closeOverlay") {
    view.overlay = null;
    return;
  }
  if (id === "restart") return restartLevel();
  if (id === "home") {
    view.screen = "home";
    view.overlay = null;
    return;
  }
  if (id === "toggleMusic") {
    save.musicEnabled = !save.musicEnabled;
    storage.writeSave(save);
    return;
  }
  if (id === "toggleSound") {
    save.soundEnabled = !save.soundEnabled;
    storage.writeSave(save);
    return;
  }
  if (id === "claimCheckin") return claimCheckin();
  if (id === "adSuccess") return grantAdReward();
  if (id === "adEarlyClose") {
    view.overlay = null;
    toast("完整观看后才能获得奖励");
    return;
  }
  if (id === "adFail") {
    view.overlay = null;
    toast("广告暂时不可用，请稍后再试");
    return;
  }
  if (id === "nextLevel") return startLevel(save.currentLevelId);
  if (id === "undo") return tryUndo();
  if (id === "up" || id === "down" || id === "left" || id === "right") return tryMove(id);
}

function hitTest(x, y) {
  for (let index = view.buttons.length - 1; index >= 0; index -= 1) {
    const button = view.buttons[index];
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button.id;
    }
  }
  return "";
}

wx.onTouchStart((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  const id = hitTest(touch.clientX, touch.clientY);
  if (id) handleButton(id);
});

try {
  wx.onKeyDown((event) => {
    const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (map[event.key]) tryMove(map[event.key]);
  });
} catch (err) {
  // Keyboard input is only available in some development environments.
}

clampProgress();
storage.writeSave(save);
setTimeout(() => {
  view.screen = "home";
}, 450);
render();
