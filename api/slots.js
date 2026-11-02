const { query, ensureSchema } = require('./_lib/db');
const { requireApiKey, sendError, sendJson } = require('./_lib/http');
const { serializeSlot } = require('./_lib/booking-helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'method not allowed');
  }
  if (!requireApiKey(req, res)) return;

  await ensureSchema();

  const provider = req.query && req.query.provider;

  const params = [];
  let where = '';
  if (typeof provider === 'string' && provider.length > 0) {
    params.push(provider);
    where = 'WHERE s.provider = $1';
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

  sendJson(res, 200, {
    slots: rows.map((row) => serializeSlot(row, row.available)),
  });
};
