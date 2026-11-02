const crypto = require("crypto");
const { sendError } = require("./http");
const { recordAttemptAndCheck } = require("./rate-limit");

// Hash both sides first so the comparison is constant-time even when the
// lengths differ.
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

// Returns true if the caller may continue; otherwise writes the response.
async function requireAdmin(req, res) {
  const expected = (process.env.ADMIN_KEY || "").trim();
  if (!expected) {
    sendError(res, 500, "server is missing its ADMIN_KEY configuration");
    return false;
  }
  const provided = typeof req.headers["x-admin-key"] === "string" ? req.headers["x-admin-key"].trim() : "";
  if (provided && safeEqual(provided, expected)) {
    return true;
  }
  // Wrong/missing key: throttle guessing per IP (reuses the 5/min limiter).
  const { limited, retryAfter } = await recordAttemptAndCheck(`admin-auth:${clientIp(req)}`);
  if (limited) {
    sendError(res, 429, "too many failed admin attempts, try again shortly", {
      "Retry-After": String(retryAfter),
    });
    return false;
  }
  sendError(res, 403, "admin access required");
  return false;
}

module.exports = { requireAdmin };
