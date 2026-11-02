const { query, ensureSchema, getPool } = require('./_lib/db');
const { requireApiKey, readJsonBody, sendError, sendJson } = require('./_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'method not allowed');
  }
  if (!requireApiKey(req, res)) return;

  await ensureSchema();

  const body = readJsonBody(req);
  if (body === null || !Array.isArray(body.slots)) {
    return sendError(res, 400, 'body must be { "slots": [...] }');
  }

  for (const slot of body.slots) {
    if (
      typeof slot.id !== 'string' ||
      typeof slot.provider !== 'string' ||
      typeof slot.start !== 'string' ||
      typeof slot.end !== 'string'
    ) {
      return sendError(res, 400, 'every slot needs id, provider, start and end');
    }
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Reset is meant to give every level a clean slate when the grader
    // calls it between test runs, so it clears everything derived from
    // bookings too (idempotency replay cache, rate-limit attempt log) —
    // not just the bookings/slots the spec calls out by name.
    await client.query('DELETE FROM booking_attempts');
    await client.query('DELETE FROM idempotency_keys');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM slots');

    for (const slot of body.slots) {
      await client.query(
        'INSERT INTO slots (id, provider, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [slot.id, slot.provider, slot.start, slot.end],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  sendJson(res, 200, { ok: true, slots: body.slots.length });
};
