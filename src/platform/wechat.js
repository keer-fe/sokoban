import { createFriendBoard } from './friend-board.js';
import { createWorldLeaderboard } from './world-leaderboard.js';
import { createPkRooms } from './pk-rooms.js';

const CLOUD_ENV_ID = 'cloud1-d5gqpaioo2d8acf27';
const WORLD_PROFILE_KEY = 'worldLeaderboardProfile';

function resolveCloudFileURLs(cloud, fileIDs) {
  if (typeof cloud.downloadFile === 'function') {
    return Promise.all(fileIDs.map((fileID) => new Promise((resolve, reject) => {
      cloud.downloadFile({
        fileID,
        success: ({ tempFilePath }) => {
          if (!tempFilePath) {
            reject(new Error(`Cloud download returned no temporary path: ${fileID}`));
            return;
          }
          resolve(tempFilePath);
        },
        fail: reject,
      });
    })));
  }
  return new Promise((resolve, reject) => {
    cloud.getTempFileURL({
      fileList: fileIDs,
      success: ({ fileList = [] }) => {
        const failed = fileIDs.flatMap((fileID, index) => {
          const file = fileList[index];
          if (file && file.tempFileURL) return [];
          const detail = file && (file.errMsg || file.status);
          return [`${fileID}: ${detail || 'no URL returned'}`];
        });
        if (failed.length) {
          reject(new Error(`Cloud storage denied or could not resolve files:\n${failed.join('\n')}`));
          return;
        }
        resolve(fileList.map((file) => file.tempFileURL));
      },
      fail: reject,
    });
  });
}

// The simulator can return {} for the menu capsule. Never pass undefined into layout math.
export function normalizeWechatWindowInfo(info, capsule) {
  const validInset = (value, max) => Number.isFinite(value) && value >= 0 && value < max;
  const height = info.windowHeight;
  const safeTop = validInset(info.safeArea && info.safeArea.top, height / 2)
    ? info.safeArea.top : 0;
  const statusBarHeight = validInset(info.statusBarHeight, height / 2) ? info.statusBarHeight : 0;
  const capsuleBottom = capsule && capsule.bottom;
  // Reserve a navigation row below the status bar when capsule geometry is unavailable.
  const top = validInset(capsuleBottom, height / 2) && capsuleBottom > 0
    ? Math.max(safeTop, capsuleBottom) : Math.max(safeTop, statusBarHeight) + 44;
  const bottom = info.safeArea && info.safeArea.bottom;
  const navigationCenterY = validInset(capsule?.top, height / 2)
    && validInset(capsuleBottom, height / 2) && capsuleBottom > capsule.top
    ? (capsule.top + capsuleBottom) / 2 : top - 22;
  return {
    width: info.windowWidth,
    height,
    pixelRatio: info.pixelRatio,
    safeTop: top,
    navigationCenterY,
    safeBottom: Number.isFinite(bottom) && bottom > height / 2 && bottom <= height ? height - bottom : 0,
  };
}

// wx stays at the platform boundary. Pages never depend on a global wx object.
export function createWechatPlatform(api) {
  const canvas = api.createCanvas();
  let gameClubButton = null;
  let gameClubVisible = false;
  if (api.cloud && typeof api.cloud.init === 'function') {
    api.cloud.init({ env: CLOUD_ENV_ID });
  }
  return {
    canvas,
    friendBoard: createFriendBoard(api),
    worldLeaderboard: createWorldLeaderboard(api.cloud),
    pkRooms: createPkRooms(api),
    initialPkRoom: String(api.getLaunchOptionsSync?.().query?.pkRoom || '').trim().toUpperCase(),
    initialCoopRoom: String(api.getLaunchOptionsSync?.().query?.coopRoom || '').trim().toUpperCase(),
    canRequestPlayerProfile: typeof api.getUserProfile === 'function',
    readPlayerProfile() {
      const profile = typeof api.getStorageSync === 'function' ? api.getStorageSync(WORLD_PROFILE_KEY) : null;
      return profile && typeof profile === 'object' ? profile : null;
    },
    requestPlayerProfile() {
      if (typeof api.getUserProfile !== 'function') return Promise.resolve(this.readPlayerProfile());
      return new Promise((resolve) => api.getUserProfile({
        desc: '用于在世界榜展示你的头像和昵称',
        success: ({ userInfo = {} }) => {
          const profile = {
            nickname: typeof userInfo.nickName === 'string' ? userInfo.nickName.trim().slice(0, 16) : '',
            avatarUrl: typeof userInfo.avatarUrl === 'string' ? userInfo.avatarUrl.trim().slice(0, 1024) : '',
          };
          if (typeof api.setStorageSync === 'function') api.setStorageSync(WORLD_PROFILE_KEY, profile);
          resolve(profile);
        },
        fail: () => resolve(this.readPlayerProfile()),
      }));
    },
    gameClubButton: typeof api.createGameClubButton === 'function' ? {
      update(style) {
        if (!gameClubButton) {
          gameClubButton = api.createGameClubButton({ icon: 'green', style: { ...style } });
        } else if (gameClubButton.style) {
          Object.assign(gameClubButton.style, style);
        }
        if (gameClubVisible && gameClubButton && gameClubButton.show) gameClubButton.show();
      },
      show() {
        gameClubVisible = true;
        if (gameClubButton && gameClubButton.show) gameClubButton.show();
      },
      hide() {
        gameClubVisible = false;
        if (gameClubButton && gameClubButton.hide) gameClubButton.hide();
      },
      destroy() {
        gameClubVisible = false;
        if (gameClubButton && gameClubButton.destroy) gameClubButton.destroy();
        gameClubButton = null;
      },
    } : null,
    createImage: () => api.createImage(),
    vibrate: () => {
      if (typeof api.vibrateShort === 'function') api.vibrateShort({ type: 'light' });
    },
    resolveCloudFiles(fileIDs) {
      if (!api.cloud || (typeof api.cloud.downloadFile !== 'function'
        && typeof api.cloud.getTempFileURL !== 'function')) {
        return Promise.reject(new Error('Cloud file download APIs are unavailable'));
      }
      const entries = Object.entries(fileIDs);
      return resolveCloudFileURLs(api.cloud, entries.map(([, fileID]) => fileID))
        .then((urls) => Object.fromEntries(entries.map(([name], index) => [name, urls[index]])));
    },
    loadFont(url) {
      if (typeof api.loadFont !== 'function') return null;
      if (!/^https?:\/\//.test(url) || typeof api.downloadFile !== 'function') {
        return api.loadFont(url);
      }
      return new Promise((resolve, reject) => {
        api.downloadFile({
          url,
          success: ({ statusCode, tempFilePath }) => {
            if (statusCode && statusCode >= 400) {
              reject(new Error(`Font download failed with HTTP ${statusCode}`));
              return;
            }
            if (!tempFilePath) {
              reject(new Error('Font download returned no temporary file path'));
              return;
            }
            const family = api.loadFont(tempFilePath);
            if (!family) {
              reject(new Error('wx.loadFont failed to load the downloaded font'));
              return;
            }
            resolve(family);
          },
          fail: reject,
        });
      });
    },
    loadCloudFont(fileID) {
      if (typeof api.loadFont !== 'function') return null;
      if (!api.cloud || typeof api.cloud.downloadFile !== 'function') {
        return Promise.reject(new Error('wx.cloud.downloadFile is unavailable'));
      }
      return new Promise((resolve, reject) => {
        api.cloud.downloadFile({
          fileID,
          success: ({ tempFilePath }) => {
            if (!tempFilePath) {
              reject(new Error('Cloud font download returned no temporary file path'));
              return;
            }
            const family = api.loadFont(tempFilePath);
            if (!family) {
              reject(new Error('wx.loadFont failed to load the downloaded cloud font'));
              return;
            }
            resolve(family);
          },
          fail: reject,
        });
      });
    },
    createAudio(src, { loop = false, volume = 1 } = {}) {
      const audio = api.createInnerAudioContext ? api.createInnerAudioContext() : null;
      if (!audio) return { play() {}, pause() {}, stop() {}, destroy() {}, setVolume() {} };
      audio.src = src;
      audio.loop = loop;
      audio.volume = volume;
      audio.autoplay = false;
      return {
        play: () => audio.play(),
        pause: () => audio.pause(),
        stop: () => audio.stop(),
        destroy: () => audio.destroy && audio.destroy(),
        setVolume: (v) => { audio.volume = v; },
      };
    },
    now: () => Date.now(),
    wallNow: () => Date.now(),
    readStorage: (key) => api.getStorageSync(key),
    writeStorage: (key, value) => api.setStorageSync(key, value),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    getWindowInfo() {
      const info = api.getWindowInfo();
      const capsule = typeof api.getMenuButtonBoundingClientRect === 'function'
        ? api.getMenuButtonBoundingClientRect() : null;
      return normalizeWechatWindowInfo(info, capsule);
    },
    notify: (title) => api.showToast({ title, icon: 'none', duration: 1800 }),
    subscribe({ pointer, show, hide, resize }) {
      const wrap = (type) => (event) => {
        const touches = event.changedTouches || [];
        touches.forEach((touch) => pointer(type, {
          id: touch.identifier, x: touch.clientX, y: touch.clientY,
        }));
      };
      const start = wrap('start');
      const move = wrap('move');
      const end = wrap('end');
      const cancel = () => pointer('cancel', { id: -1, x: 0, y: 0 });
      api.onTouchStart(start); api.onTouchMove(move);
      api.onTouchEnd(end); api.onTouchCancel(cancel);
      api.onShow(show); api.onHide(hide); api.onWindowResize(resize);
      return () => {
        api.offTouchStart(start); api.offTouchMove(move);
        api.offTouchEnd(end); api.offTouchCancel(cancel);
        api.offShow(show); api.offHide(hide); api.offWindowResize(resize);
      };
    },
  };
}
