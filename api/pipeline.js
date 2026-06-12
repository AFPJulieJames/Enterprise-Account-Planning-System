import { isAuthed } from "./_lib.js";

/*
 * Synced pipeline storage backed by Supabase (Postgres via PostgREST).
 * The whole saved-strategy list is kept as one row in table `app_kv`,
 * key = 'atb-pipeline', value = JSON string. The service-role key is
 * used server-side only and is never exposed to the browser.
 *
 * One-time table setup (run in Supabase SQL editor):
 *   create table if not exists app_kv (
 *     key text primary key,
 *     value text,
 *     updated_at timestamptz default now()
 *   );
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY = "atb-pipeline";

function headers() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function readValue() {
  const url = `${SUPABASE_URL}/rest/v1/app_kv?key=eq.${KEY}&select=value`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error("read failed");
  const rows = await r.json();
  return rows.length ? rows[0].value : null;
}

async function writeValue(value) {
  // Upsert on primary key.
  const url = `${SUPABASE_URL}/rest/v1/app_kv?on_conflict=key`;
  const r = await fetch(url, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: KEY, value, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("write failed");
}

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: "unauthorized" });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Supabase not configured" });

  try {
    if (req.method === "GET") {
      const value = await readValue();
      return res.status(200).json({ value });
    }
    if (req.method === "POST") {
      const { value } = req.body || {};
      if (typeof value !== "string") return res.status(400).json({ error: "missing value" });
      await writeValue(value);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(502).json({ error: "storage unavailable" });
  }
}
