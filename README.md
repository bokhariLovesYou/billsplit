# Housebook

BillSplit opens at the root. The donation tracker lives at `/donations`. Both use same-origin Vercel Functions and PostgreSQL. The shared editing password unlocks household records and donation details. Signed-out donation views show monthly summaries.

## Preview locally

Use Node 22 or newer. Keep the donation archive's original `ledger.json` and the JSON array returned by the current BillSplit GET endpoint in `private-data/ledger.json` and `private-data/months.json`. This directory is ignored by Git, Vercel uploads, and the Vite development file server.

```sh
npm ci
node scripts/import-finance.mjs --local
npm run dev
```

Open the printed local URL. The local password is in `private-data/local-password.txt`. Local edits persist in the embedded PostgreSQL database under `private-data/preview-pg`. Stop the server before running a local import again.

## Hosted branch preview

Connect a dedicated free PostgreSQL database to the Vercel Preview environment. Set a random `EDIT_PASSWORD` of at least 24 characters for Preview. Supply the same database connection string in an ignored `.env.preview.local` file as `DATABASE_URL` or `POSTGRES_URL`. Run:

```sh
node --env-file=.env.preview.local scripts/import-finance.mjs
```

The transaction compares every row and field with the two snapshots and checks the dashboard donation total. Matching imports can be repeated. A mismatch rolls back the full transaction. The app runtime never reads or writes Val Town.

For a later production cutover, pause edits in the original apps, take fresh snapshots, and repeat the same import into a separate empty production database before switching traffic. Preview edits stay in the preview database.
