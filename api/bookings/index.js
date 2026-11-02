const { query, ensureSchema } = require('../_lib/db');
const { requireApiKey, readJsonBody, sendError, sendJson } = require('../_lib/http');
const {
  isValidEmail,
  serializeBooking,
  hashBody,
  newId,
} = require('../_lib/booking-helpers');
const { recordAttemptAndCheck } = require('../_lib/rate-limit');

function encodeCursor(row) {
  // seq is the DB's own monotonic insertion order -- see the comment on
  // the bookings table. Using it (rather than created_at) avoids the
  // millisecond/microsecond precision mismatch that let a boundary row
  // reappear on the next page.
  return Buffer.from(String(row.seq), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  try {
    const seq = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!/^\d+$/.test(seq)) return null;
    return seq;
  } catch {
    return null;
  }
}

async function handleGet(req, res) {
  const email = req.query && req.query.email;
  if (typeof email !== 'string' || email.trim() === '') {
    return sendError(res, 400, 'email query parameter is required');
  }

  const rawLimit = req.query && req.query.limit;
  let limit = 10;
  if (rawLimit !== undefined) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return sendError(res, 400, 'limit must be an integer between 1 and 50');
    }
  }

  let cursorFilter = '';
  const params = [email.trim().toLowerCase()];
  if (req.query && req.query.cursor) {
    const decodedSeq = decodeCursor(req.query.cursor);
    if (!decodedSeq) {
      return sendError(res, 400, 'invalid cursor');
    }
    params.push(decodedSeq);
    cursorFilter = `AND seq > $2`;
  }

  // Fetch one extra row so we know whether there's a next page without a
  // separate COUNT query.
  params.push(limit + 1);
  const limitParamIndex = params.length;

  const { rows } = await query(
    `
    SELECT id, seq, slot_id, name, email, status, created_at
    FROM bookings
    WHERE email_lower = $1
    ${cursorFilter}
    ORDER BY seq ASC
    LIMIT $${limitParamIndex}
    `,
    params,
  );

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  sendJson(res, 200, {
    bookings: page.map(serializeBooking),
    next_cursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  });
}

async function handlePost(req, res) {
  const body = readJsonBody(req);
  if (body === null) {
    return sendError(res, 400, 'body must be valid JSON');
  }

  const idempotencyKey = req.headers['idempotency-key'];
  const bodyHash = hashBody(body);

  // --- Level 4: idempotency replay -------------------------------------
  if (idempotencyKey) {
    const { rows } = await query(
      'SELECT request_hash, status_code, response_body FROM idempotency_keys WHERE key = $1',
      [idempotencyKey],
    );
    if (rows.length > 0) {
      const existing = rows[0];
      if (existing.request_hash === bodyHash) {
        return sendJson(res, existing.status_code, existing.response_body);
      }
      return sendError(res, 422, 'Idempotency-Key was already used with a different request body');
    }
  }

  // --- Level 5: rate limiting -------------------------------------------
  // Keyed by whatever email was supplied, even before we know it's a
  // *valid* email — a malformed-but-present email still identifies who is
  // hammering the endpoint. If no email was supplied at all there is
  // nothing to key on, so that request just falls through to normal
  // validation (which will 400 it for the missing email anyway).
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  let statusCode;
  let responseBody;
  let retryAfter = null;

  if (rawEmail) {
    const { limited, retryAfter: wait } = await recordAttemptAndCheck(rawEmail.toLowerCase());
    if (limited) {
      statusCode = 429;
      responseBody = { error: 'too many booking attempts for this email, try again shortly' };
      retryAfter = wait;
    }
  }

  if (statusCode === undefined) {
    const result = await createBooking(body, rawEmail);
    statusCode = result.statusCode;
    responseBody = result.responseBody;
  }

  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter));
  }

  // Cache the outcome for idempotency replay — but not a 429. Rate
  // limiting is a real-time concern; freezing a stale 429 under a key
  // forever (long after the window has passed) would be wrong.
  if (idempotencyKey && statusCode !== 429) {
    await query(
      `INSERT INTO idempotency_keys (key, request_hash, status_code, response_body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [idempotencyKey, bodyHash, statusCode, JSON.stringify(responseBody)],
    );
  }

  sendJson(res, statusCode, responseBody);
}

// --- Level 1/2/3: validation, existence, timing, double-booking ---------
async function createBooking(body, rawEmail) {
  const slotId = typeof body.slot_id === 'string' ? body.slot_id.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = rawEmail.toLowerCase();

  if (!slotId || !name || !email || !isValidEmail(email)) {
    return {
      statusCode: 400,
      responseBody: { error: 'slot_id, name and a valid email are required' },
    };
  }

  const { rows: slotRows } = await query(
    'SELECT id, start_time FROM slots WHERE id = $1',
    [slotId],
  );
  if (slotRows.length === 0) {
    return { statusCode: 404, responseBody: { error: 'slot not found' } };
  }

  const slot = slotRows[0];
  if (new Date(slot.start_time).getTime() <= Date.now()) {
    return { statusCode: 400, responseBody: { error: 'slot has already started' } };
  }

  const id = newId('bk');
  try {
    const { rows } = await query(
      `INSERT INTO bookings (id, slot_id, name, email, email_lower, status, created_at)
       VALUES ($1, $2, $3, $4, $4, 'confirmed', now())
       RETURNING id, slot_id, name, email, status, created_at`,
      [id, slotId, name, email],
    );
    return { statusCode: 201, responseBody: serializeBooking(rows[0]) };
  } catch (err) {
    // Unique violation on the partial index = someone else already holds
    // this slot. This is what makes Level 3 hold even when two requests
    // land at the exact same instant: Postgres serializes the two inserts
    // and only one of them can win the unique index.
    if (err.code === '23505') {
      return { statusCode: 409, responseBody: { error: 'slot already booked' } };
    }
    throw err;
  }
}

module.exports = async (req, res) => {
  if (!requireApiKey(req, res)) return;
  await ensureSchema();

  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  return sendError(res, 405, 'method not allowed');
};
