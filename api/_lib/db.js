const { Pool } = require('pg');

// A single pooled connection per serverless instance. Keep the pool tiny —
// serverless functions scale by spawning more instances, not more
// connections per instance, and free-tier Postgres (Neon/Supabase) has a
// limited connection budget.
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      ssl: connectionString.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}

// Runs once per cold start (the IF NOT EXISTS clauses make repeats cheap
// and safe). This keeps the project deploy-and-go: no separate migration
// step needed on a fresh Neon/Supabase database.
let schemaReady = null;
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS slots (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        -- Monotonic insertion order, used for cursor pagination. We don't
        -- paginate on created_at directly: a JS Date round-trips through
        -- an ISO string at millisecond precision, while Postgres stores
        -- timestamps at microsecond precision, so a timestamp-based cursor
        -- can silently miss or repeat a row. A plain increasing integer
        -- has no such precision loss.
        seq BIGSERIAL,
        slot_id TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        email_lower TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- The actual guarantee behind Level 3: the database itself refuses a
      -- second confirmed booking for the same slot, even if two requests
      -- land in the same millisecond. Cancelling a booking removes it from
      -- this index (status changes to 'cancelled'), freeing the slot.
      CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_booking_per_slot
        ON bookings (slot_id) WHERE status = 'confirmed';

      CREATE INDEX IF NOT EXISTS bookings_email_idx
        ON bookings (email_lower, seq);

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        request_hash TEXT NOT NULL,
        status_code INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS booking_attempts (
        id BIGSERIAL PRIMARY KEY,
        email_lower TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS booking_attempts_email_idx
        ON booking_attempts (email_lower, created_at);
    `).then(() => true);
  }
  return schemaReady;
}

module.exports = { query, ensureSchema, getPool };
