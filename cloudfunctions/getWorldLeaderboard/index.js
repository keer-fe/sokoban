const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const PLAYERS = 'leaderboard_players';
const SCORE_VERSION = 1;

function anonymousName(openid) {
  let hash = 2166136261;
  for (const char of String(openid)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `玩家${(hash >>> 0).toString(16).slice(-4).toUpperCase().padStart(4, '0')}`;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const requested = Number(event.limit);
  const limit = Number.isInteger(requested) ? Math.max(1, Math.min(100, requested)) : 50;
  const scoreVersion = SCORE_VERSION;

  const result = await db.collection(PLAYERS)
    .where({ scoreVersion })
    .orderBy('completed', 'desc')
    .orderBy('totalStars', 'desc')
    .orderBy('updatedAt', 'asc')
    .limit(limit)
    .get();

  let rank = 0;
  let previousScore = null;
  const rows = result.data.map((player, index) => {
    const score = `${player.completed}:${player.totalStars}`;
    if (score !== previousScore) rank = index + 1;
    previousScore = score;
    return {
      rank,
      completed: player.completed,
      totalStars: player.totalStars,
      nickname: anonymousName(player._id),
      isMe: player._id === OPENID,
    };
  });

  return { rows };
};
