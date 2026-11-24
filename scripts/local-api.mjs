import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { handleMonths } from '../api/months.js';
import { handle } from '../server/http.mjs';
import { localDatabase } from './local-database.mjs';

export function localApi() {
  let db;
  async function configure(server) {
    await mkdir('private-data', { recursive: true, mode: 0o700 });
    const file = 'private-data/local-password.txt';
    try {
      await writeFile(file, randomBytes(24).toString('base64url') + '\n', {mode: 0o600, flag: 'wx'});
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    process.env.EDIT_PASSWORD = (await readFile(file, 'utf8')).trim();
    server.middlewares.use('/api', async (req, res, next) => {
      const url = new URL(req.url, 'http://' + req.headers.host);
      const route = url.pathname.slice(1);
      if (!['months', 'ledger', 'session', 'extras', 'periods'].includes(route)) return next();
      try {
        const options = { method: req.method, headers: req.headers };
        if (!['GET', 'HEAD'].includes(req.method)) Object.assign(options, { body: req, duplex: 'half' });
        const request = new Request(url, options);
        const connect = () => db ??= localDatabase();
        const result = route === 'months' ? await handleMonths(request, connect) : await handle(route, request, connect);
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(await result.text());
      } catch {
        res.writeHead(500).end('Local API unavailable.');
      }
    });
    server.httpServer?.once('close', () => db?.end());
  }
  return { name: 'housebook-local-api', configureServer: configure, configurePreviewServer: configure };
}
