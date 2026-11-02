# Koya Clinic — Booking API + Web UI

A clinic appointment booking API (matching the spec at `koyaacademy.com/assessment-api`)
plus a React/Tailwind web app that uses it. Built for a free-tier deploy on Vercel + Neon.

## What's inside

- **`/api`** — serverless functions (plain Node, no framework) implementing every endpoint
  in the spec: `POST /reset`, `GET /slots`, `POST /bookings`, `GET /bookings`,
  `GET /bookings/{id}`, `DELETE /bookings/{id}`.
- **`/web`** — the React + Vite + Tailwind frontend.
- **`/scripts`** — a local test server (`test-server.js`) and an automated test suite
  (`test-suite.js`) that exercises all 5 levels, including a 20-way concurrent booking
  race, used to verify this before handing it over.

## How each level is implemented

- **Level 1** — `/reset`, `/slots`, `POST /bookings`, `GET /bookings/{id}`.
- **Level 2** — every route checks `X-API-Key` (401 if missing/wrong). Booking validates
  `slot_id`/`name`/`email`, trims whitespace, lowercases email, checks the slot exists and
  hasn't started.
- **Level 3** — a **partial unique index** in Postgres (`one_confirmed_booking_per_slot`)
  is the actual mechanism, not application-level locking. Even if many requests hit at the
  exact same instant, the database only lets one `INSERT` succeed; every other one gets a
  unique-constraint violation, which the code turns into a `409`. Verified with a 100-way
  concurrent request test: exactly 1 success, 99 conflicts. Cancelling sets `status =
  'cancelled'`, which removes the row from that index and frees the slot.
- **Level 4** — `Idempotency-Key` responses are cached in a `idempotency_keys` table
  (keyed by the request's hash), not in memory — serverless functions don't share memory
  between invocations, so an in-memory cache would silently fail in production.
  Pagination uses a cursor based on a monotonic `seq` column, not a timestamp (a timestamp
  cursor looked right locally but actually double-counted a row under load, because a JS
  `Date` only has millisecond precision while Postgres timestamps have microsecond
  precision — caught this while testing and switched to an integer sequence instead).
- **Level 5** — 5 attempts/email/minute, backed by a `booking_attempts` table (again, not
  memory). `Retry-After` is computed from the oldest attempt still inside the 60-second
  window, and it's been tested by actually waiting it out and confirming the next request
  succeeds.

## Setup

### 1. Database (Neon, free)
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **pooled connection string** it gives you.

### 2. Local environment
Copy `.env.example` to a new file named `.env` in the project root, and fill in the three
values (your Neon connection string, plus any two strings you choose for the API keys —
they just need to match each other):
```
DATABASE_URL=postgres://...from neon...
API_KEY=some-long-random-string
VITE_API_KEY=some-long-random-string
```
Then install dependencies:
```bash
npm install
```

### 3. Run locally — this needs **two things running at once**
The web app (Vite) and the API are two separate processes. Vite only serves the page;
it forwards `/slots`, `/bookings`, `/reset` to the API, so the API has to actually be
running too, in its own terminal window, or those requests fail with `ECONNREFUSED` (that's
the error from the screenshot — Vite was running but the API wasn't).

**Terminal 1 — start the API:**
```bash
npm run test:local-api
```
Leave this running. You should see `test server on :3333`.

**Terminal 2 — seed some sample slots (first time only, or whenever you want fresh data):**
```bash
npm run seed
```
This posts a few days' worth of sample appointment slots to your database so the page
has something to show. You only need to re-run it if you want to reset the data.

**Terminal 2 (or a third) — start the web app:**
```bash
npm run dev
```
Then open `http://localhost:5173`. You should see the seeded slots under "Open
appointments".

**Alternative:** if you have the Vercel CLI and a Vercel account, `npx vercel dev` runs
the web app and the real `/api` functions together on one port, closest to how
production behaves. The two-terminal approach above is simpler for local testing and
doesn't need a Vercel account.

### 4. Deploy
1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com) (free Hobby plan).
3. In the Vercel project's **Environment Variables**, add `DATABASE_URL`, `API_KEY`, and
   `VITE_API_KEY` (same values as your `.env`).
4. Deploy. `vercel.json` already rewrites `/reset`, `/slots`, `/bookings`, `/bookings/:id`
   to the serverless functions under `/api`, so the public API matches the spec exactly —
   no `/api/` prefix.

Everything here runs on free tiers: Vercel Hobby, Neon's free Postgres tier, GitHub. The
only thing to know: Neon's free databases suspend after inactivity and take a second or
two to wake up on the next request — that's normal, not a bug.

## A deliberate trade-off worth knowing about

The spec has no login system, so the browser has to send `X-API-Key` directly, which means
it's baked into the built frontend JS and technically visible in dev tools to anyone who
looks. That's an inherent limitation of "browser calls a key-gated API with no
backend-for-frontend layer" — not an oversight. Fine for this assessment's scope.

## Design

Palette, type, and layout were chosen specifically for a clinic (not a generic SaaS
template): deep botanical green + a warm marigold accent, a warm paper background,
Newsreader (serif) for headings paired with Inter for body/UI. All colors are CSS
variables in `web/src/index.css` (`:root`) — change them there and the whole app re-themes,
no component edits needed.
