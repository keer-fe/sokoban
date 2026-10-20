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
  let sharedMode = 'pk';
  const modeName = () => sharedMode === 'coop' ? '合作闯关' : '双人 PK';
  if (typeof api.onShareAppMessage === 'function') {
    api.onShareAppMessage(() => ({
      title: sharedRoom ? `来和我${modeName()}！房间 ${sharedRoom}` : `推箱子${modeName()}`,
      query: sharedRoom ? `${sharedMode}Room=${encodeURIComponent(sharedRoom)}` : '',
    }));
  }
  return {
    available: Boolean(cloud && typeof cloud.callFunction === 'function'),
    create: (levelId, profile, mode = 'pk') => call(cloud, { action: 'create', levelId, profile, mode }),
    join: (code, profile) => call(cloud, { action: 'join', code, profile }),
    get: (code) => call(cloud, { action: 'get', code }),
    ready: (code, ready) => call(cloud, { action: 'ready', code, ready }),
    start: (code) => call(cloud, { action: 'start', code }),
    finish: (code, steps) => call(cloud, { action: 'finish', code, steps }),
    move: (code, direction) => call(cloud, { action: 'move', code, direction }),
    complete: (code) => call(cloud, { action: 'complete', code }),
    leave: (code) => call(cloud, { action: 'leave', code }),
    setSharedRoom(code = '', mode = 'pk') { sharedRoom = code; sharedMode = mode; },
    share(code, mode = 'pk') {
      sharedRoom = code;
      sharedMode = mode;
      if (typeof api.shareAppMessage === 'function') api.shareAppMessage({
        title: `来和我${modeName()}！房间 ${code}`,
        query: `${mode}Room=${encodeURIComponent(code)}`,
      });
    },
    promptCode(mode = 'pk') {
      if (typeof api.showModal !== 'function') return Promise.resolve('');
      return new Promise((resolve) => api.showModal({
        title: `加入${mode === 'coop' ? '合作' : 'PK'}房间`, content: '', editable: true, placeholderText: '输入 6 位房间码',
        confirmText: '加入',
        success: ({ confirm, content }) => resolve(confirm ? String(content || '').trim().toUpperCase() : ''),
        fail: () => resolve(''),
      }));
    },
  };
}
