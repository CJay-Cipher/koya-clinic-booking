require("dotenv").config();
const http = require("http");

const PORT = 3333;

const reset = require("../api/reset.js");
const slots = require("../api/slots.js");
const bookings = require("../api/bookings/index.js");
const bookingById = require("../api/bookings/[id].js");

function decode(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

// Same routes as vercel.json.
function route(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "reset") return { handler: reset };
  if (parts[0] === "slots" && parts.length === 1) return { handler: slots };
  if (parts[0] === "slots" && parts.length === 2) return { handler: slots, id: decode(parts[1]) };
  if (parts[0] === "bookings" && parts.length === 1) return { handler: bookings };
  if (parts[0] === "bookings" && parts.length === 2) return { handler: bookingById, id: decode(parts[1]) };
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "not found" }));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const target = route(url.pathname);
    if (!target) return sendNotFound(res);

    // Minimal Vercel-style helpers the handlers rely on.
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    const query = {};
    for (const [k, v] of url.searchParams) query[k] = v;
    if (target.id !== undefined) query.id = target.id;
    req.query = query;

    const raw = await readBody(req);
    if (!raw) {
      req.body = undefined;
    } else {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = raw; // handlers treat unparseable text as invalid JSON
      }
    }

    await target.handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal server error" }));
    }
  }
});

server.listen(PORT, () => console.log(`test server on :${PORT}`));
