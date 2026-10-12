import { createOpenDataBoard } from './context.js';

const board = createOpenDataBoard(wx);
wx.onMessage(message => {
  board.onMessage(message).catch(error => console.error('[好友榜] 开放数据域处理失败', error.message));
});
