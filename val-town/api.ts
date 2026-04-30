/**
 * BillSplit API — paste this entire file into a Val Town HTTP val.
 *
 * Run this once in the Val Town SQLite editor to create the table:
 *
 *   CREATE TABLE IF NOT EXISTS billsplit_months (
 *     month_key  TEXT PRIMARY KEY,
 *     data_json  TEXT NOT NULL,
 *     saved_at   TEXT NOT NULL
 *   );
 *
 * Endpoints:
 *   GET    /                    → all months, newest first
 *   POST   /                    → upsert a month (body: full month JSON)
 *   DELETE /?monthKey=2026-04   → delete a month
 */

import sqlite from "https://esm.town/v/std/sqlite/main.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);

  // ── GET all months ────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const result = await sqlite.execute(
      "SELECT data_json FROM billsplit_months ORDER BY month_key DESC"
    );
    const months = result.rows.map((row) => JSON.parse(row[0] as string));
    return json(months);
  }

  // ── POST upsert month ─────────────────────────────────────────────────────
  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const monthKey = body.monthKey as string;
    if (!monthKey) return json({ error: "monthKey is required" }, 400);

    const savedAt = (body.savedAt as string) || new Date().toISOString();

    await sqlite.execute(
      `INSERT OR REPLACE INTO billsplit_months (month_key, data_json, saved_at) VALUES (?, ?, ?)`,
      [monthKey, JSON.stringify(body), savedAt]
    );

    return json({ ok: true, monthKey });
  }

  // ── DELETE month ──────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const monthKey = url.searchParams.get("monthKey");
    if (!monthKey) return json({ error: "monthKey query param is required" }, 400);

    await sqlite.execute(
      "DELETE FROM billsplit_months WHERE month_key = ?",
      [monthKey]
    );

    return json({ ok: true, monthKey });
  }

  return json({ error: "Method not allowed" }, 405);
}
