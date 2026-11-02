# Koya Clinic — Booking API + Web UI

A clinic appointment booking API (matching the spec at `koyaacademy.com/assessment-api`)
plus a React/Tailwind web app that uses it, with a small staff area for managing slots.
Built for a free-tier deploy on Vercel + Neon.

## What's inside

- **`/api`**: serverless functions (plain Node, no framework).
  - Spec endpoints: `POST /reset`, `GET /slots`, `POST /bookings`, `GET /bookings`,
    `GET /bookings/{id}`, `DELETE /bookings/{id}`.
  - Extra, staff-only endpoints: `POST /slots`, `PATCH /slots/{id}`, `DELETE /slots/{id}`.
- **`/web`**: the React + Vite + Tailwind frontend (booking page, booking lookup, staff page).
- **`/scripts`**: a local server (`test-server.js`), a seed script, and an automated test
  suite (`test-suite.js`) covering all 5 levels, including a 20-way concurrent booking race.

## How each level is implemented

- **Level 1**: `/reset`, `/slots`, `POST /bookings`, `GET /bookings/{id}`.
- **Level 2**: every route checks `X-API-Key` (401 if missing or wrong). Booking validates
  `slot_id`/`name`/`email`, trims whitespace, lowercases email, checks the slot exists and
  hasn't started.
- **Level 3**: a **partial unique index** in Postgres (`one_confirmed_booking_per_slot`) is the
  actual mechanism, not application-level locking. Even if many requests arrive at the same
  instant, the database lets only one `INSERT` succeed; the rest hit a unique violation that
  the code turns into a `409`. Cancelling sets `status = 'cancelled'`, which removes the row
  from that index and frees the slot.
- **Level 4**: `Idempotency-Key` responses are stored in an `idempotency_keys` table (not in
  memory, because serverless instances don't share memory). Pagination uses a cursor based on
  a monotonic `seq` column rather than a timestamp, which avoids the millisecond vs
  microsecond precision mismatch between JS `Date` and Postgres.
- **Level 5**: 5 attempts per email per minute, backed by a `booking_attempts` table.
  `Retry-After` is computed from the oldest attempt still inside the 60-second window.

## Staff slot management (extra, outside the 5 levels)

Patients can only read slots. Creating, editing and deleting slots needs a **second key**.

| Method   | Path          | Headers                     | Notes                                                                         |
| -------- | ------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `POST`   | `/slots`      | `X-API-Key` + `X-Admin-Key` | body: `provider`, `start`, `end`, optional `id`. Start must be in the future. |
| `PATCH`  | `/slots/{id}` | `X-API-Key` + `X-Admin-Key` | any of `provider`, `start`, `end`                                             |
| `DELETE` | `/slots/{id}` | `X-API-Key` + `X-Admin-Key` |                                                                               |

- A missing or wrong admin key returns **403**. Failed attempts are rate limited per IP
  (5 per minute), and keys are compared in constant time.
- A slot with a **confirmed booking** cannot be edited or deleted (**409**). Cancel the booking
  first. Overlapping slots for the same provider are rejected with 409.
- `POST /reset` stays on the normal API key only, so the assessment checks keep working.
- The UI lives at `/admin` (linked as "Staff login" in the footer). It asks for the admin key,
  keeps it in `sessionStorage` for the tab only, and never bakes it into the build.

## Setup

### 1. Database (Neon, free)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **pooled connection string** it gives you.

### 2. Local environment

Copy `.env.example` to `.env` in the project root and fill in the values:

```
DATABASE_URL=postgres://...from neon...
API_KEY=some-long-random-string
VITE_API_KEY=some-long-random-string
ADMIN_KEY=a-different-long-random-string
```

- `VITE_API_KEY` must equal `API_KEY`.
- `ADMIN_KEY` must **not** start with `VITE_`, otherwise Vite would publish it in the
  frontend bundle.
- Use letters, numbers and dashes in keys. An unquoted `#` in a `.env` value starts a
  comment and silently truncates it.

Then install dependencies:

```bash
npm install
```

### 4. Run locally: two processes

Vite only serves the page and proxies `/slots`, `/bookings` and `/reset` to the API, so the
API must be running too, or requests fail with `ECONNREFUSED`.

**Terminal 1: API**

```bash
npm run test:local-api
```

You should see `test server on :3333`.

**Terminal 2: seed sample slots (first time, or to reset data)**

```bash
npm run seed
```

**Terminal 3: web app**

```bash
npm run dev
```

Open `http://localhost:5173`. Staff page: `http://localhost:5173/admin`.

Alternative: `npx vercel dev` runs the web app and the real `/api` functions together.

### 5. Run the tests

With the local API running:

```bash
node scripts/test-suite.js
```

**Warning:** the suite calls `/reset`, which deletes all slots and bookings in the connected
database. Run `npm run seed` afterwards to restore sample data.

### 6. Deploy

1. Commit and Push the updates.
2. Import it into [Vercel](https://vercel.com) (free Hobby plan).
3. In **Environment Variables**, add `DATABASE_URL`, `API_KEY`, `VITE_API_KEY` and
   `ADMIN_KEY`. Redeploy after changing variables; they only apply to new deployments.
4. `vercel.json` rewrites `/reset`, `/slots`, `/slots/:id`, `/bookings` and `/bookings/:id`
   to the functions under `/api` (no `/api/` prefix in the public API), and serves the app
   for `/admin`.

The project uses 4 serverless functions, well within the Hobby plan limit. Everything runs on
free tiers: Vercel Hobby, Neon's free Postgres, GitHub. Neon's free databases suspend after
inactivity and take a second or two to wake on the next request. That is normal.

## A deliberate trade-off worth knowing about

The spec has no login system, so the browser sends `X-API-Key` directly, which means it is
visible in the built JS and in dev tools. That is inherent to "browser calls a key-gated API
with no backend-for-frontend", and fine for this scope. This is exactly why slot management
uses a separate `ADMIN_KEY` that is never shipped to the browser build.

## Frontend notes

- **Custom controls**: the provider filter, start time, duration and date fields use custom
  components (`Select`, `DatePicker`, `Field`) with keyboard support. No native selects.
- **Loading and empty states**: spinner and skeleton loaders, retry on error, and empty states
  for no slots, no provider results and no bookings.
- **Short references**: new bookings get ids like `bk_k7m2x9qpa4`. Older long ids are shown
  shortened with click-to-copy; lookup still uses the full id.
- **Responsive**: breakpoints are `xs` 480px, `sm` 640px and up. Rows stack on small screens.

## Design

Palette, type and layout were chosen for a clinic: deep botanical green with a warm marigold
accent, a warm paper background, Newsreader (serif) headings with Inter for body and UI.
All colors are CSS variables in `web/src/index.css` (`:root`); change them there and the whole
app re-themes.
