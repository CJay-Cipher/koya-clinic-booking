const { query, ensureSchema } = require('../_lib/db');
const { requireApiKey, sendError, sendJson } = require('../_lib/http');
const { serializeBooking } = require('../_lib/booking-helpers');

module.exports = async (req, res) => {
  if (!requireApiKey(req, res)) return;
  await ensureSchema();

  const id = req.query && req.query.id;
  if (typeof id !== 'string' || !id) {
    return sendError(res, 404, 'no booking with that id');
  }

  if (req.method === 'GET') {
    const { rows } = await query(
      'SELECT id, slot_id, name, email, status, created_at FROM bookings WHERE id = $1',
      [id],
    );
    if (rows.length === 0) {
      return sendError(res, 404, 'no booking with that id');
    }
    return sendJson(res, 200, serializeBooking(rows[0]));
  }

  if (req.method === 'DELETE') {
    const { rows } = await query(
      'SELECT id, slot_id, name, email, status, created_at FROM bookings WHERE id = $1',
      [id],
    );
    if (rows.length === 0) {
      return sendError(res, 404, 'no booking with that id');
    }
    if (rows[0].status === 'cancelled') {
      return sendError(res, 409, 'booking is already cancelled');
    }

    const { rows: updated } = await query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1
       RETURNING id, slot_id, name, email, status, created_at`,
      [id],
    );
    return sendJson(res, 200, serializeBooking(updated[0]));
  }

  return sendError(res, 405, 'method not allowed');
};
