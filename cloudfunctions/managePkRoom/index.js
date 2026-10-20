const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const ROOMS = 'pk_rooms';
const ROOM_TTL = 30 * 60 * 1000;
const START_DELAY = 5000;

function cleanCode(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
function cleanText(value, length) { return typeof value === 'string' ? value.trim().slice(0, length) : ''; }
function profile(value = {}) {
  return { nickname: cleanText(value.nickname, 16), avatarUrl: cleanText(value.avatarUrl, 1024) };
}
function code() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}
function missing(error) { return /DOCUMENT_NOT_FOUND|not\s+exist|does not exist|-1/i.test(`${error?.errCode || ''} ${error?.message || ''}`); }
function collectionMissing(error) {
  return /COLLECTION_NOT_EXIST|collection.+not\s+exist|集合不存在|-502005/i
    .test(`${error?.errCode || ''} ${error?.message || ''}`);
}
function collectionExists(error) {
  return /COLLECTION_ALREADY_EXIST|already\s+exist|集合已存在/i
    .test(`${error?.errCode || ''} ${error?.message || ''}`);
}
async function ensureRoomsCollection() {
  if (typeof db.createCollection !== 'function') return false;
  try { await db.createCollection(ROOMS); } catch (error) {
    if (!collectionExists(error)) throw error;
  }
  return true;
}
function ensureActive(room) {
  if (!room || Number(room.expiresAt) < Date.now()) throw new Error('ROOM_EXPIRED');
}
function playerIndex(room, openid) { return room.players.findIndex(player => player.openid === openid); }
function publicRoom(room, openid) {
  const meIndex = playerIndex(room, openid);
  const now = Date.now();
  const status = room.status === 'countdown' && Number(room.startAt) <= now ? 'playing' : room.status;
  return {
    code: room._id, levelId: room.levelId, status, winner: room.winner || 0,
    startAt: Number(room.startAt) || null, serverNow: now,
    players: room.players.map((player, index) => ({
      seat: index + 1, nickname: player.nickname || `玩家 ${index + 1}`,
      avatarUrl: player.avatarUrl || '', ready: Boolean(player.ready),
      finished: Boolean(player.result), result: player.result || null,
    })),
    me: meIndex < 0 ? null : { seat: meIndex + 1, isHost: room.host === openid,
      ready: Boolean(room.players[meIndex].ready), finished: Boolean(room.players[meIndex].result),
      result: room.players[meIndex].result || null },
  };
}
async function getRoom(roomCode) {
  const result = await db.collection(ROOMS).doc(roomCode).get();
  ensureActive(result.data);
  return result.data;
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) throw new Error('MISSING_OPENID');
  const action = cleanText(event.action, 16);
  if (action === 'create') {
    if (!/^[a-z0-9-]{1,64}$/i.test(String(event.levelId || ''))) throw new Error('INVALID_LEVEL');
    // New CloudBase environments do not create a collection when a function is deployed.
    // Initialize it lazily so the first room creation works without a manual console step.
    try { await db.collection(ROOMS).limit(1).get(); } catch (error) {
      if (!collectionMissing(error) || !(await ensureRoomsCollection())) throw error;
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const roomCode = code();
      try { await db.collection(ROOMS).doc(roomCode).get(); } catch (error) {
        if (!missing(error)) throw error;
        const player = { openid: OPENID, ...profile(event.profile), ready: false, result: null };
        await db.collection(ROOMS).doc(roomCode).set({ data: {
          levelId: event.levelId, status: 'waiting', host: OPENID, players: [player], winner: 0,
          createdAt: db.serverDate(), startAt: null, expiresAt: Date.now() + ROOM_TTL,
        } });
        return { ok: true, room: publicRoom({ _id: roomCode, levelId: event.levelId,
          status: 'waiting', host: OPENID, players: [player], winner: 0 }, OPENID) };
      }
    }
    throw new Error('ROOM_CODE_EXHAUSTED');
  }
  const roomCode = cleanCode(event.code);
  if (roomCode.length !== 6) throw new Error('INVALID_CODE');
  if (action === 'get') return { ok: true, room: publicRoom(await getRoom(roomCode), OPENID) };
  const room = await db.runTransaction(async (transaction) => {
    const document = transaction.collection(ROOMS).doc(roomCode);
    const current = (await document.get()).data;
    ensureActive(current);
    const index = playerIndex(current, OPENID);
    if (action === 'join') {
      if (index < 0 && (current.status !== 'waiting' || current.players.length >= 2)) throw new Error('ROOM_FULL');
      if (index < 0) current.players.push({ openid: OPENID, ...profile(event.profile), ready: false, result: null });
    } else if (action === 'ready') {
      if (index < 0 || current.status !== 'waiting') throw new Error('ROOM_NOT_WAITING');
      current.players[index].ready = Boolean(event.ready);
    } else if (action === 'start') {
      if (current.host !== OPENID) throw new Error('HOST_ONLY');
      if (current.status !== 'waiting' || current.players.length !== 2
        || !current.players.every(player => player.ready)) throw new Error('PLAYERS_NOT_READY');
      current.status = 'countdown'; current.startAt = Date.now() + START_DELAY;
    } else if (action === 'finish') {
      if (current.status === 'countdown' && Date.now() >= Number(current.startAt)) current.status = 'playing';
      if (index < 0 || current.status !== 'playing') throw new Error('ROOM_NOT_PLAYING');
      const steps = Number(event.steps);
      if (!Number.isInteger(steps) || steps < 1 || steps > 100000) throw new Error('INVALID_STEPS');
      if (!current.players[index].result) current.players[index].result = {
        steps, elapsedMs: Math.max(0, Date.now() - Number(current.startAt)),
      };
      if (current.players.every(player => player.result)) {
        const [a, b] = current.players.map(player => player.result);
        const comparison = a.steps - b.steps || a.elapsedMs - b.elapsedMs;
        current.winner = comparison === 0 ? 0 : comparison < 0 ? 1 : 2;
        current.status = 'finished';
      }
    } else if (action === 'leave') {
      if (index >= 0 && current.status !== 'finished') current.status = 'cancelled';
    } else throw new Error('INVALID_ACTION');
    await document.update({ data: {
      players: current.players, status: current.status, winner: current.winner || 0,
      startAt: current.startAt || null, updatedAt: db.serverDate(),
    } });
    return current;
  });
  return { ok: true, room: publicRoom({ ...room, _id: roomCode }, OPENID) };
};
