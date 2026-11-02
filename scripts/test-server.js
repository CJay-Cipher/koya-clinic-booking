require('dotenv').config();
const http = require('http');
const { URL } = require('url');

const reset = require('../api/reset');
const slots = require('../api/slots');
const bookingsIndex = require('../api/bookings/index');
const bookingsId = require('../api/bookings/[id]');

function buildRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return res;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // let the handler's readJsonBody report it as invalid
  }
}

const server = http.createServer(async (req, res) => {
  buildRes(res);
  const url = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(url.searchParams.entries());
  req.body = await readBody(req);

  try {
    if (url.pathname === '/reset') return await reset(req, res);
    if (url.pathname === '/slots') return await slots(req, res);
    if (url.pathname === '/bookings') return await bookingsIndex(req, res);
    const match = url.pathname.match(/^\/bookings\/([^/]+)$/);
    if (match) {
      req.query.id = decodeURIComponent(match[1]);
      return await bookingsId(req, res);
    }
    res.status(404).json({ error: 'not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error', detail: String(err.message || err) });
  }
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => console.log(`test server on :${PORT}`));
