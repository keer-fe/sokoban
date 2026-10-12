import { createOpenDataBoard } from '../open-data/context.js';
import { PROGRESS_KEY } from '../open-data/model.js';
import { createFriendBoard } from '../src/platform/friend-board.js';

// Explicit opt-in only. These records never enter WeChat or player storage.
export function createDemoFriends(mode) {
  const canvas = document.createElement('canvas');
  let own = [];
  const names = ['爱挪箱子的朋友', '小木箱', '绿帽小伙伴', '慢慢推也能赢', '箱子研究员', '开心闯关', '推箱达人'];
  const rows = Array.from({ length: 14 }, (_, i) => ({ openid: `demo-${String(i).padStart(2, '0')}`,
    nickname: names[i % names.length], avatarUrl: '',
    KVDataList: [{ key: PROGRESS_KEY, value: JSON.stringify({ completed: Math.max(0, 50 - Math.floor(i / 2) * 7) }) }] }));
  const reply = (options, value, fail = false) => setTimeout(() => {
    if (fail) options.fail({ errMsg: 'Preview simulated failure' }); else options.success(value);
  }, 150);
  const board = createOpenDataBoard({
    getSharedCanvas: () => canvas,
    createImage: () => new Image(),
    getUserCloudStorage: options => reply(options, { KVDataList: own }, mode === 'offline'),
    setUserCloudStorage: options => { own = options.KVDataList; reply(options, {}); },
    getFriendCloudStorage: options => reply(options, { data: mode === 'empty' ? [] : rows }, ['error', 'offline'].includes(mode)),
  });
  const bridge = createFriendBoard({ getOpenDataContext: () => ({ canvas,
    postMessage: message => { board.onMessage(message); } }) });
  bridge.demo = true;
  return bridge;
}
