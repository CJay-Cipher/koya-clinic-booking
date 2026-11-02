const crypto = require("crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}

function serializeBooking(row) {
  return {
    id: row.id,
    slot_id: row.slot_id,
    name: row.name,
    email: row.email,
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function serializeSlot(row, available) {
  return {
    id: row.id,
    provider: row.provider,
    start: new Date(row.start_time).toISOString(),
    end: new Date(row.end_time).toISOString(),
    ...(available !== undefined ? { available } : {}),
  };
}

// Canonical JSON (sorted keys) so that two logically-identical bodies with
// different key order still hash the same — relevant for the Idempotency-Key
// "same key + same body" comparison in Level 4.
function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashBody(body) {
  return crypto.createHash("sha256").update(canonicalJson(body)).digest("hex");
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike chars (i, l, o, 0, 1)
function shortId(prefix, length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += ID_ALPHABET[crypto.randomInt(ID_ALPHABET.length)];
  return `${prefix}_${out}`;
}

module.exports = {
  isValidEmail,
  serializeBooking,
  serializeSlot,
  canonicalJson,
  hashBody,
  newId,
  shortId,
};
