const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const PLAYERS = 'leaderboard_players';
const SCORE_VERSION = 1;
const MAX_COMPLETED = 100;
const MAX_TOTAL_STARS = MAX_COMPLETED * 3;

function validInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isMissingDocument(error) {
  const detail = `${error && error.errCode || ''} ${error && error.message || ''}`;
  return /DOCUMENT_NOT_FOUND|not\s+exist|does not exist|-1/i.test(detail);
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const completed = Number(event.completed);
  const totalStars = Number(event.totalStars);
  const scoreVersion = Number(event.scoreVersion);

  if (!OPENID) throw new Error('MISSING_OPENID');
  if (!validInteger(completed, 0, MAX_COMPLETED)) throw new Error('INVALID_COMPLETED');
  if (!validInteger(totalStars, 0, MAX_TOTAL_STARS)) throw new Error('INVALID_TOTAL_STARS');
  if (scoreVersion !== SCORE_VERSION) throw new Error('INVALID_SCORE_VERSION');

  return db.runTransaction(async (transaction) => {
    const document = transaction.collection(PLAYERS).doc(OPENID);
    let previous = null;
    try {
      previous = (await document.get()).data;
    } catch (error) {
      if (!isMissingDocument(error)) throw error;
    }

    const previousCompleted = validInteger(previous && previous.completed, 0, MAX_COMPLETED)
      ? previous.completed : 0;
    const previousStars = validInteger(previous && previous.totalStars, 0, MAX_TOTAL_STARS)
      ? previous.totalStars : 0;
    const nextCompleted = Math.max(previousCompleted, completed);
    const nextStars = Math.max(previousStars, totalStars);
    const improved = !previous || nextCompleted > previousCompleted || nextStars > previousStars;
    const updatedAt = improved ? db.serverDate() : previous.updatedAt;

    await document.set({ data: {
      completed: nextCompleted,
      totalStars: nextStars,
      scoreVersion: SCORE_VERSION,
      updatedAt: updatedAt || db.serverDate(),
    } });

    return { ok: true, completed: nextCompleted, totalStars: nextStars };
  });
};
