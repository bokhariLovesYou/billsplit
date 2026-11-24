import pg from 'pg';

let pool;
export function database() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new Error('Set DATABASE_URL in the server environment.');
    pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 12000 });
    pool.on('error', (error) => console.error('Database connection lost:', error.code || error.name));
  }
  return pool;
}

export async function transaction(db, callback) {
  if (db.transaction) return db.transaction(callback);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
