const { query, ensureSchema } = require("./_lib/db");
const { requireApiKey, readJsonBody, sendError, sendJson } = require("./_lib/http");
const { requireAdmin } = require("./_lib/admin");
const { serializeSlot, shortId } = require("./_lib/booking-helpers");

const HAS_CONFIRMED = `EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = $1 AND b.status = 'confirmed')`;

function getSlotId(req) {
  const q = req.query && req.query.id;
  if (typeof q === "string" && q) return q;
  const m = /^\/(?:api\/)?slots\/([^/?#]+)/.exec(req.url || "");
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findOverlap(provider, start, end, excludeId) {
  const { rows } = await query(
    `SELECT id FROM slots
     WHERE provider = $1 AND start_time < $3 AND end_time > $2
       AND ($4::text IS NULL OR id <> $4)
     LIMIT 1`,
    [provider, start.toISOString(), end.toISOString(), excludeId],
  );
  return rows.length > 0;
}

// ---- GET /slots (public, unchanged behaviour) ---------------------------
async function handleList(req, res) {
  const provider = req.query && req.query.provider;
  const params = [];
  let where = "";
  if (typeof provider === "string" && provider.length > 0) {
    params.push(provider);
    where = "WHERE s.provider = $1";
  }
  const { rows } = await query(
    `
    SELECT s.id, s.provider, s.start_time, s.end_time,
           NOT EXISTS (
             SELECT 1 FROM bookings b
             WHERE b.slot_id = s.id AND b.status = 'confirmed'
           ) AS available
    FROM slots s
    ${where}
    ORDER BY s.start_time ASC
    `,
    params,
  );
  sendJson(res, 200, { slots: rows.map((row) => serializeSlot(row, row.available)) });
}

// ---- POST /slots (admin) --------------------------------------------------
async function handleCreate(req, res) {
  const body = readJsonBody(req);
  if (body === null) return sendError(res, 400, "body must be valid JSON");

  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  if (!provider) return sendError(res, 400, "provider is required");

  const start = parseDate(body.start);
  const end = parseDate(body.end);
  if (!start || !end) return sendError(res, 400, "start and end must be valid date-times");
  if (end <= start) return sendError(res, 400, "end must be after start");
  if (start.getTime() <= Date.now()) return sendError(res, 400, "start must be in the future");

  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : shortId("s", 6);

  if (await findOverlap(provider, start, end, null)) {
    return sendError(res, 409, "this provider already has a slot that overlaps that time");
  }

  try {
    const { rows } = await query(
      `INSERT INTO slots (id, provider, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, provider, start_time, end_time`,
      [id, provider, start.toISOString(), end.toISOString()],
    );
    return sendJson(res, 201, serializeSlot(rows[0], true));
  } catch (err) {
    if (err.code === "23505") return sendError(res, 409, "a slot with this id already exists");
    throw err;
  }
}

// ---- PATCH /slots/:id (admin) --------------------------------------------
async function handleUpdate(req, res, id) {
  const body = readJsonBody(req);
  if (body === null) return sendError(res, 400, "body must be valid JSON");

  const { rows: cur } = await query("SELECT id, provider, start_time, end_time FROM slots WHERE id = $1", [id]);
  if (cur.length === 0) return sendError(res, 404, "slot not found");

  if (body.provider === undefined && body.start === undefined && body.end === undefined) {
    return sendError(res, 400, "nothing to update");
  }

  let provider = cur[0].provider;
  if (body.provider !== undefined) {
    provider = typeof body.provider === "string" ? body.provider.trim() : "";
    if (!provider) return sendError(res, 400, "provider cannot be empty");
  }
  const start = body.start !== undefined ? parseDate(body.start) : new Date(cur[0].start_time);
  const end = body.end !== undefined ? parseDate(body.end) : new Date(cur[0].end_time);
  if (!start || !end) return sendError(res, 400, "start and end must be valid date-times");
  if (end <= start) return sendError(res, 400, "end must be after start");

  if (await findOverlap(provider, start, end, id)) {
    return sendError(res, 409, "this provider already has a slot that overlaps that time");
  }

  // The NOT EXISTS guard makes "has a confirmed booking" part of the same statement.
  const { rows } = await query(
    `UPDATE slots SET provider = $2, start_time = $3, end_time = $4
     WHERE id = $1 AND NOT ${HAS_CONFIRMED}
     RETURNING id, provider, start_time, end_time`,
    [id, provider, start.toISOString(), end.toISOString()],
  );
  if (rows.length === 0) {
    return sendError(res, 409, "this slot has a confirmed booking; cancel the booking first");
  }
  return sendJson(res, 200, serializeSlot(rows[0], true));
}

// ---- DELETE /slots/:id (admin) -------------------------------------------
async function handleDelete(req, res, id) {
  const { rows } = await query(`DELETE FROM slots WHERE id = $1 AND NOT ${HAS_CONFIRMED} RETURNING id`, [id]);
  if (rows.length === 0) {
    const { rows: exists } = await query("SELECT 1 FROM slots WHERE id = $1", [id]);
    if (exists.length === 0) return sendError(res, 404, "slot not found");
    return sendError(res, 409, "this slot has a confirmed booking; cancel the booking first");
  }
  return sendJson(res, 200, { deleted: true, id });
}

module.exports = async (req, res) => {
  if (!requireApiKey(req, res)) return;
  await ensureSchema();

  const id = getSlotId(req);

  if (req.method === "GET" && !id) return handleList(req, res);

  if (req.method === "POST" && !id) {
    if (!(await requireAdmin(req, res))) return;
    return handleCreate(req, res);
  }
  if (req.method === "PATCH" && id) {
    if (!(await requireAdmin(req, res))) return;
    return handleUpdate(req, res, id);
  }
  if (req.method === "DELETE" && id) {
    if (!(await requireAdmin(req, res))) return;
    return handleDelete(req, res, id);
  }
  return sendError(res, 405, "method not allowed");
};
