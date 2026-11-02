// Small helpers shared by every handler. Kept dependency-free on purpose —
// this is a handful of serverless functions, not a framework.

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sendError(res, status, message, extraHeaders) {
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      res.setHeader(key, value);
    }
  }
  sendJson(res, status, { error: message });
}

// Vercel's Node runtime gives us req.body already parsed for JSON content
// types, but guard against it being missing/malformed anyway.
function readJsonBody(req) {
  if (req.body === undefined || req.body === null || req.body === '') {
    return {};
  }
  if (typeof req.body === 'object') {
    return req.body;
  }
  try {
    return JSON.parse(req.body);
  } catch {
    return null; // signals "invalid JSON" to the caller
  }
}

// Level 2: every request needs X-API-Key. Returns true if the request is
// allowed to continue; writes the 401 response itself otherwise.
function requireApiKey(req, res) {
  const expected = process.env.API_KEY;
  const provided = req.headers['x-api-key'];
  if (!expected) {
    // Misconfiguration on our side, not the caller's — but we never want
    // to silently accept everyone, so fail closed.
    sendError(res, 500, 'server is missing its API_KEY configuration');
    return false;
  }
  if (!provided || provided !== expected) {
    sendError(res, 401, 'missing or invalid API key');
    return false;
  }
  return true;
}

module.exports = { sendJson, sendError, readJsonBody, requireApiKey };
