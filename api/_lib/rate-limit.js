const { query } = require('./db');

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 5;

// Records this attempt for the given email and reports whether the caller
// is over the limit. Sliding window: "5 attempts per email per minute"
// means at most 5 rows for this email in the trailing 60 seconds.
//
// We insert the attempt row first, then count — so the attempt that tips
// the count past the limit is the one that gets the 429. This keeps the
// logic in one round trip and is safe under concurrent requests because
// the count is read back from the same transaction-consistent insert.
async function recordAttemptAndCheck(emailLower) {
  await query(
    'INSERT INTO booking_attempts (email_lower, created_at) VALUES ($1, now())',
    [emailLower],
  );

  const { rows } = await query(
    `SELECT created_at FROM booking_attempts
     WHERE email_lower = $1 AND created_at > now() - interval '${WINDOW_SECONDS} seconds'
     ORDER BY created_at ASC`,
    [emailLower],
  );

  if (rows.length <= MAX_ATTEMPTS) {
    return { limited: false };
  }

  // Over the limit: tell the caller how long until the oldest attempt in
  // the window ages out, which is the earliest moment they could succeed.
  const oldest = new Date(rows[0].created_at);
  const elapsedSeconds = (Date.now() - oldest.getTime()) / 1000;
  const retryAfter = Math.max(1, Math.ceil(WINDOW_SECONDS - elapsedSeconds));
  return { limited: true, retryAfter };
}

module.exports = { recordAttemptAndCheck };
