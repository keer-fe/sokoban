const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const PLAYERS = 'leaderboard_players';
const SCORE_VERSION = 2;
const MAX_COMPLETED = 100;

function validInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isMissingDocument(error) {
  const detail = `${error && error.errCode || ''} ${error && error.message || ''}`;
  return /DOCUMENT_NOT_FOUND|not\s+exist|does not exist|-1/i.test(detail);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const completed = Number(event.completed);
  const scoreVersion = Number(event.scoreVersion);
  const nickname = cleanText(event.nickname, 16);
  const avatarUrl = cleanText(event.avatarUrl, 1024);

  if (!OPENID) throw new Error('MISSING_OPENID');
  if (!validInteger(completed, 0, MAX_COMPLETED)) throw new Error('INVALID_COMPLETED');
  if (scoreVersion !== SCORE_VERSION) throw new Error('INVALID_SCORE_VERSION');

  return db.runTransaction(async (transaction) => {
    const document = transaction.collection(PLAYERS).doc(OPENID);
    let previous = null;
    try {
      previous = (await document.get()).data;
    } catch (error) {
      if (!isMissingDocument(error)) throw error;
    }

    const previousCompleted = previous && previous.scoreVersion === SCORE_VERSION
      && validInteger(previous.completed, 0, MAX_COMPLETED)
      ? previous.completed : 0;
    const nextCompleted = Math.max(previousCompleted, completed);
    const improved = !previous || previous.scoreVersion !== SCORE_VERSION || nextCompleted > previousCompleted;
    const updatedAt = improved ? db.serverDate() : previous.updatedAt;

    await document.set({ data: {
      completed: nextCompleted,
      scoreVersion: SCORE_VERSION,
      nickname: nickname || cleanText(previous && previous.nickname, 16),
      avatarUrl: avatarUrl || cleanText(previous && previous.avatarUrl, 1024),
      updatedAt: updatedAt || db.serverDate(),
    } });

    return { ok: true, completed: nextCompleted };
  });
};
