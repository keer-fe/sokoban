// Only messages and pixels cross the open-data boundary, never friend records.
export function createFriendBoard(api) {
  let context;
  let unavailable = false;
  function getContext() {
    if (unavailable) return null;
    if (!context) {
      try { context = api.getOpenDataContext(); }
      catch { unavailable = true; }
    }
    return context;
  }
  return {
    get available() { return Boolean(getContext()); },
    get canvas() { const value = getContext(); return value && value.canvas; },
    send(type, data = {}) {
      const value = getContext();
      if (!value) return;
      try {
        // WeChat only allows sharedCanvas dimensions to be changed in the main domain.
        if (type === 'resize') {
          const ratio = Math.max(1, Math.min(3, Number(data.pixelRatio) || 1));
          const width = Math.round(Math.max(300, Math.min(414, Number(data.width) || 366)) * ratio);
          const height = Math.round(Math.max(430, Math.min(700, Number(data.height) || 520)) * ratio);
          if (value.canvas.width !== width) value.canvas.width = width;
          if (value.canvas.height !== height) value.canvas.height = height;
        }
        value.postMessage({ ...data, type, channel: 'sokoban.friends.v1' });
      }
      catch { unavailable = true; }
    },
  };
}
