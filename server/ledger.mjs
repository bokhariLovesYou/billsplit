import { randomUUID } from 'node:crypto';
import { transaction } from './database.mjs';

export async function readLedger(db, owner) {
  const { rows: [ledger] } = await db.query(`
    WITH contributions_by_month AS (
      SELECT period, sum(amount) AS total,
        jsonb_agg(jsonb_build_object('id', id, 'amount', amount, 'description', description, 'reserved', reserved)
          ORDER BY position, id) AS items
      FROM contributions GROUP BY period
    )
    SELECT
      (SELECT coalesce(jsonb_agg(
        jsonb_build_object('period', p.period, 'target', p.target, 'carry', p.carry,
          'amountListed', coalesce(c.total, 0), 'note', CASE WHEN $1 THEN p.note ELSE '' END,
          'contributions', CASE WHEN $1 THEN coalesce(c.items, '[]'::jsonb) ELSE '[]'::jsonb END)
        ORDER BY left(p.period, 4) DESC, CASE WHEN right(p.period, 5) = 'Bonus' THEN '03a' ELSE substring(p.period FROM 6) END DESC
      ), '[]'::jsonb) FROM periods p LEFT JOIN contributions_by_month c USING (period)) AS periods,
      CASE WHEN $1 THEN (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY date DESC, id), '[]'::jsonb) FROM extras e)
        ELSE '[]'::jsonb END AS extras,
      (SELECT coalesce(sum(amount), 0) FROM contributions WHERE reserved = 0)
        + (SELECT coalesce(sum(amount), 0) FROM extras WHERE reference = 0) AS total
  `, [owner]);
  return { periods: ledger.periods, extras: ledger.extras, visibility: owner ? 'owner' : 'summary', allTimeDonated: Number(ledger.total) };
}

export function invalid(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

function amount(value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum || value > 100_000_000_000) invalid('Enter a valid dollar amount.');
  return value;
}
function string(value, limit, required = false) {
  if (typeof value !== 'string' || value.trim().length > limit || (required && !value.trim())) invalid('Check the description or notes.');
  return value.trim();
}

export async function savePeriod(db, input) {
  const { period, target, carry, note, contributions, create } = input;
  if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2]|Bonus)$/.test(period) || +period.slice(0, 4) < 1900) invalid('Choose a valid year and month.');
  if (!Array.isArray(contributions) || contributions.length > 250) invalid('Check the contribution list.');
  const values = [period, amount(target), amount(carry), string(note, 4000)];
  const rows = contributions.map((entry, position) => {
    if (!entry || typeof entry !== 'object') invalid('Check the contribution list.');
    return {
      id: randomUUID(), amount: amount(entry.amount, 1), description: string(entry.description, 500, true),
      position, reserved: entry.reserved === true ? 1 : 0,
    };
  });

  await transaction(db, async (client) => {
    const result = create
      ? await client.query('INSERT INTO periods (period, target, carry, note) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', values)
      : await client.query('UPDATE periods SET target = $2, carry = $3, note = $4 WHERE period = $1', values);
    if (!result.rowCount) invalid(create ? 'This period already exists. Open its row to edit it.' : 'This period could not be found.');
    await client.query('DELETE FROM contributions WHERE period = $1', [period]);
    await client.query(`
      INSERT INTO contributions (id, period, amount, description, position, reserved)
      SELECT id, $1, amount, description, position, reserved
      FROM jsonb_to_recordset($2::jsonb) AS rows(id uuid, amount bigint, description text, position integer, reserved integer)
    `, [period, JSON.stringify(rows)]);
  });
}

export async function saveExtra(db, input) {
  const { id, date, note, description, reference } = input;
  if (date !== '' && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) invalid('Choose a valid date.');
  if (id !== undefined && (typeof id !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))) invalid('Choose a valid donation.');
  const values = [id ?? randomUUID(), date, amount(input.amount, 1), string(description, 500, true), string(note, 4000), reference === true ? 1 : 0];
  const result = id
    ? await db.query('UPDATE extras SET date = $2, amount = $3, description = $4, note = $5, reference = $6 WHERE id = $1', values)
    : await db.query('INSERT INTO extras (id, date, amount, description, note, reference) VALUES ($1, $2, $3, $4, $5, $6)', values);
  if (!result.rowCount) invalid('This extra donation could not be found.');
}
