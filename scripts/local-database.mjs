import { PGlite } from '@electric-sql/pglite';

export function localDatabase() {
  const db = new PGlite('private-data/preview-pg');
  function adapt(client) {
    return {
      async query(sql, values) {
        const result = await client.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows };
      },
    };
  }
  return {
    ...adapt(db),
    transaction: fn => db.transaction(client => fn(adapt(client))),
    end: () => db.close(),
  };
}
