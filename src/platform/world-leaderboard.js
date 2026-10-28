const SCORE_VERSION = 2;

function callCloudFunction(cloud, name, data) {
  return new Promise((resolve, reject) => {
    if (!cloud || typeof cloud.callFunction !== 'function') {
      reject(new Error('wx.cloud.callFunction is unavailable'));
      return;
    }
    cloud.callFunction({
      name,
      data,
      success: ({ result }) => resolve(result),
      fail: reject,
    });
  });
}

export function normalizeWorldRows(value) {
  const rows = value && Array.isArray(value.rows) ? value.rows : [];
  return rows.flatMap((row, index) => {
    if (!row || !Number.isInteger(row.completed) || row.completed < 0
      ) return [];
    return [{
      rank: Number.isInteger(row.rank) && row.rank > 0 ? row.rank : index + 1,
      completed: row.completed,
      nickname: typeof row.nickname === 'string' && row.nickname.trim()
        ? row.nickname.trim().slice(0, 16) : `玩家${index + 1}`,
      avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl.trim().slice(0, 1024) : '',
      isMe: row.isMe === true,
    }];
  });
}

export function createWorldLeaderboard(cloud) {
  return {
    available: Boolean(cloud && typeof cloud.callFunction === 'function'),
    submit({ completed, nickname = '', avatarUrl = '' }) {
      return callCloudFunction(cloud, 'submitLeaderboard', {
        completed,
        nickname,
        avatarUrl,
        scoreVersion: SCORE_VERSION,
      });
    },
    async load(limit = 50) {
      const result = await callCloudFunction(cloud, 'getWorldLeaderboard', {
        limit,
        scoreVersion: SCORE_VERSION,
      });
      return normalizeWorldRows(result);
    },
  };
}
