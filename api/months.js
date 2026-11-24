import { database } from '../server/database.mjs';
import { isEditor } from '../server/auth.mjs';
import { json, readJson } from '../server/http.mjs';

export async function handleMonths(request, db = database) {
  if (!isEditor(request)) return json({ error: 'Unlock BillSplit first.' }, 401);
  try {
    if (request.method === 'GET') {
      const result = await db().query('SELECT data FROM billsplit_months ORDER BY month_key DESC');
      return json(result.rows.map(row => row.data));
    }
    const url = new URL(request.url);
    if (request.headers.get('origin') !== url.origin) return json({ error: 'Unexpected origin.' }, 403);
    const body = request.method === 'POST' ? await readJson(request) : null;
    const key = body ? body.monthKey : url.searchParams.get('monthKey');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return json({ error: 'Invalid month.' }, 400);
    if (request.method === 'POST') {
      await db().query('INSERT INTO billsplit_months VALUES ($1, $2) ON CONFLICT (month_key) DO UPDATE SET data = excluded.data', [key, JSON.stringify(body)]);
    } else if (request.method === 'DELETE') {
      await db().query('DELETE FROM billsplit_months WHERE month_key = $1', [key]);
    } else return json({ error: 'Method not allowed.' }, 405);
    return json({ ok: true, monthKey: key });
  } catch (error) {
    return json({ error: error.status ? error.message : 'BillSplit database request failed.' }, error.status || 500);
  }
}

export const GET = request => handleMonths(request);
export const POST = GET;
export const DELETE = GET;
