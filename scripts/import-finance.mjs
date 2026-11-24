import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { database, transaction } from '../server/database.mjs';
import { readLedger } from '../server/ledger.mjs';

const local = process.argv.includes('--local');
const months = JSON.parse(await readFile('private-data/months.json', 'utf8'));
const donation = JSON.parse(await readFile('private-data/ledger.json', 'utf8'));
const schema = await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
const tables = [
  ['billsplit_months', 'month_key', months.map(data => ({ month_key: data.monthKey, data }))],
  ['periods', 'period', donation.periods],
  ['contributions', 'id', donation.contributions],
  ['extras', 'id', donation.extras],
];
const db = local ? (await import('./local-database.mjs')).localDatabase() : database();
try {
  await transaction(db, async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('housebook-import'))");
    for (const statement of schema.split(';').filter(s => s.trim())) await client.query(statement);
    await client.query('LOCK TABLE billsplit_months, periods, contributions, extras IN EXCLUSIVE MODE');
    for (const [table, key, source] of tables) {
      const { rows: [count] } = await client.query('SELECT count(*) AS n FROM ' + table);
      if (Number(count.n) === 0 && source.length) {
        await client.query('INSERT INTO ' + table + ' SELECT * FROM jsonb_populate_recordset(NULL::' + table + ', $1::jsonb)', [JSON.stringify(source)]);
      }
      const { rows } = await client.query('SELECT to_jsonb(t) AS record FROM ' + table + ' t');
      const expected = new Map(source.map(row => [row[key], row]));
      if (rows.length !== source.length || rows.some(({record}) => !isDeepStrictEqual(record, expected.get(record[key])))) {
        throw new Error('Source mismatch in ' + table + '. Transaction rolled back.');
      }
    }
    const api = await readLedger(client, true);
    const total = donation.contributions.filter(x => !x.reserved).concat(donation.extras.filter(x => !x.reference)).reduce((n, x) => n + x.amount, 0);
    if (api.allTimeDonated !== total) throw new Error('Donation dashboard total differs from export.');
    console.log('Field comparison passed:', tables.map(([name,, rows]) => rows.length + ' ' + name).join(', '), '— donation total $' + (total / 100).toFixed(2));
  });
} finally {
  await db.end();
}
