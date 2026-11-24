import { database } from './database.mjs';
import { endSession, isEditor, startSession } from './auth.mjs';
import { invalid, readLedger, saveExtra, savePeriod } from './ledger.mjs';

export function json(payload, status = 200, headers = {}) {
  return Response.json(payload, { status, headers: {
    'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers,
  } });
}

export async function readJson(request, limit = 150000) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') invalid('Expected JSON.');
  const text = await request.text();
  if (text.length > limit) invalid('Request too large.');
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  invalid('Invalid JSON.');
}

export async function handle(route, request, openDatabase = database) {
  try {
    const owner = isEditor(request);
    if (request.method === 'GET' && route === 'ledger') return json(await readLedger(openDatabase(), owner));
    if (route === 'session' && request.method === 'DELETE') {
      if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Unexpected origin.' }, 403);
      return json({ signedIn: false }, 200, { 'Set-Cookie': endSession() });
    }
    if (request.method !== 'POST' || route === 'ledger') {
      return json({ error: 'Method not allowed.' }, 405, { Allow: route === 'ledger' ? 'GET' : route === 'session' ? 'POST, DELETE' : 'POST' });
    }
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Unexpected origin.' }, 403);
    if (route === 'session') {
      const { password } = await readJson(request, 2048);
      const cookie = startSession(password);
      if (!cookie) return json({ error: 'Incorrect editing password.' }, 401);
      return json({ signedIn: true }, 200, { 'Set-Cookie': cookie });
    }
    if (!owner) return json({ error: 'Enter the editing password first.' }, 403);
    const input = await readJson(request);
    const db = openDatabase();
    if (route === 'periods') await savePeriod(db, input);
    else await saveExtra(db, input);
    return json(await readLedger(db, true));
  } catch (error) {
    if (!error.status) console.error('Donation API', route, error.code || error.name);
    return json({ error: error.status ? error.message : 'The database request failed. Check the connection and import.' }, error.status || 500);
  }
}
