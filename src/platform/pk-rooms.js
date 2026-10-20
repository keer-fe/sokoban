function call(cloud, data) {
  return new Promise((resolve, reject) => {
    if (!cloud || typeof cloud.callFunction !== 'function') {
      reject(new Error('微信云函数不可用'));
      return;
    }
    cloud.callFunction({
      name: 'managePkRoom', data,
      success: ({ result }) => result?.ok ? resolve(result) : reject(new Error(result?.error || 'PK 房间请求失败')),
      fail: reject,
    });
  });
}

export function createPkRooms(api) {
  const cloud = api.cloud;
  let sharedRoom = '';
  if (typeof api.onShareAppMessage === 'function') {
    api.onShareAppMessage(() => ({
      title: sharedRoom ? `来和我双人 PK！房间 ${sharedRoom}` : '推箱子双人 PK',
      query: sharedRoom ? `pkRoom=${encodeURIComponent(sharedRoom)}` : '',
    }));
  }
  return {
    available: Boolean(cloud && typeof cloud.callFunction === 'function'),
    create: (levelId, profile) => call(cloud, { action: 'create', levelId, profile }),
    join: (code, profile) => call(cloud, { action: 'join', code, profile }),
    get: (code) => call(cloud, { action: 'get', code }),
    ready: (code, ready) => call(cloud, { action: 'ready', code, ready }),
    start: (code) => call(cloud, { action: 'start', code }),
    finish: (code, steps) => call(cloud, { action: 'finish', code, steps }),
    leave: (code) => call(cloud, { action: 'leave', code }),
    setSharedRoom(code = '') { sharedRoom = code; },
    share(code) {
      sharedRoom = code;
      if (typeof api.shareAppMessage === 'function') api.shareAppMessage({
        title: `来和我双人 PK！房间 ${code}`,
        query: `pkRoom=${encodeURIComponent(code)}`,
      });
    },
    promptCode() {
      if (typeof api.showModal !== 'function') return Promise.resolve('');
      return new Promise((resolve) => api.showModal({
        title: '加入 PK 房间', content: '', editable: true, placeholderText: '输入 6 位房间码',
        confirmText: '加入',
        success: ({ confirm, content }) => resolve(confirm ? String(content || '').trim().toUpperCase() : ''),
        fail: () => resolve(''),
      }));
    },
  };
}
