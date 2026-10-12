import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'preview/index.html' : pathname.slice(1);
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || !['preview/', 'src/', 'docs/'].some((prefix) => relative.startsWith(prefix))) {
      response.writeHead(403).end(); return;
    }
    const contents = await readFile(target);
    response.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'text/plain'}; charset=utf-8`,
      'Cache-Control': 'no-store' });
    response.end(contents);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(8766, '127.0.0.1', () => console.log('首页预览：http://127.0.0.1:8766'));
