const config = require("./config");

function todayKey() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function defaultSave(now) {
  return {
    version: 1,
    currentLevelId: 1,
    maxUnlockedLevelId: 1,
    undoCards: config.newUserUndoCards,
    levelStars: {},
    lastCheckinDate: "",
    musicEnabled: true,
    soundEnabled: true,
    createdAt: now,
    updatedAt: now
  };
}

function readSave() {
  const now = Date.now();
  let save = null;
  try {
    save = wx.getStorageSync(config.storageKey);
  } catch (err) {
    save = null;
  }

  if (!save || typeof save !== "object") {
    save = defaultSave(now);
    writeSave(save);
    return save;
  }

  return Object.assign(defaultSave(now), save, {
    levelStars: save.levelStars || {},
    updatedAt: save.updatedAt || now
  });
}

function writeSave(save) {
  save.updatedAt = Date.now();
  try {
    wx.setStorageSync(config.storageKey, save);
  } catch (err) {
    console.warn("save failed", err);
  }
}

module.exports = {
  readSave,
  writeSave,
  todayKey
};
