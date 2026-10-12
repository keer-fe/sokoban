import { createApp } from './src/app.js';
import { createWechatPlatform } from './src/platform/wechat.js';

createApp(createWechatPlatform(wx)).start();
