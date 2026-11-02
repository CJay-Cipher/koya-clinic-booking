// Thin wrapper around fetch. All calls are same-origin relative paths, so
// this works identically in local dev (proxied by Vite to the API) and in
// production on Vercel (where the rewrites in vercel.json route these same
// paths to the serverless functions).
//
// The API key is baked in at build time via VITE_API_KEY. See the README
// for why this is a deliberate, documented trade-off for a keyless-login
// assessment project rather than something hidden.
const API_KEY = import.meta.env.VITE_API_KEY || "";

class ApiError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    throw new ApiError(res.status, (data && data.error) || `request failed with status ${res.status}`, retryAfter ? Number(retryAfter) : undefined);
  }
  return data;
}

export const api = {
  listSlots: (provider) => request(`/slots${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`),

  createBooking: (payload, idempotencyKey) =>
    request("/bookings", {
      method: "POST",
      body: payload,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),

  getBooking: (id) => request(`/bookings/${encodeURIComponent(id)}`),

  cancelBooking: (id) => request(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listBookings: (email, { limit = 10, cursor } = {}) => {
    const params = new URLSearchParams({ email, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request(`/bookings?${params.toString()}`);
  },

  // ---- Admin (slot management). Needs the separate X-Admin-Key. ----------
  createSlot: (adminKey, payload) => request("/slots", { method: "POST", body: payload, headers: { "X-Admin-Key": adminKey } }),

  updateSlot: (adminKey, id, payload) =>
    request(`/slots/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
      headers: { "X-Admin-Key": adminKey },
    }),

  deleteSlot: (adminKey, id) =>
    request(`/slots/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    }),
};

export { ApiError };
