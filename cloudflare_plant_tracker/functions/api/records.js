const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Database binding DB is not configured." }, 500);

  try {
    const { results = [] } = await env.DB
      .prepare("SELECT record_json FROM daily_records ORDER BY date DESC")
      .all();
    const records = results.map(row => {
      try { return JSON.parse(row.record_json); }
      catch { return null; }
    }).filter(Boolean);
    return json({ records });
  } catch (error) {
    return json({ error: "Could not read records. Make sure the D1 table has been created." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Database binding DB is not configured." }, 500);
  if (!env.EDIT_PASSWORD) return json({ error: "Editing password is not configured on the server." }, 500);

  const suppliedPassword = request.headers.get("X-Edit-Password") || "";
  if (suppliedPassword !== env.EDIT_PASSWORD) {
    return json({ error: "Incorrect editing password." }, 401);
  }

  let record;
  try {
    const raw = await request.text();
    if (raw.length > 500_000) return json({ error: "Record is too large." }, 413);
    record = JSON.parse(raw);
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return json({ error: "Invalid record." }, 400);
  }
  if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return json({ error: "A valid date is required." }, 400);
  }
  if (!Array.isArray(record.containers) || record.containers.length < 1 || record.containers.length > 100) {
    return json({ error: "Add between 1 and 100 container readings." }, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO daily_records (date, record_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(date) DO UPDATE SET
        record_json = excluded.record_json,
        updated_at = CURRENT_TIMESTAMP
    `).bind(record.date, JSON.stringify(record)).run();
    return json({ ok: true, message: "Record saved." });
  } catch (error) {
    return json({ error: "Could not save the record to the database." }, 500);
  }
}
