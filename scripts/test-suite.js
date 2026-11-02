const { Pool } = require('pg');

const BASE = 'http://localhost:3333';
const KEY = 'test-key-123';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let pass = 0;
let fail = 0;

function check(label, condition, extra) {
  if (condition) {
    pass++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  FAIL ${label}${extra ? ' -> ' + JSON.stringify(extra) : ''}`);
  }
}

async function call(method, path, { headers = {}, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, headers: res.headers, json };
}

async function main() {
  console.log('--- setup ---');
  const future1 = new Date(Date.now() + 3600_000).toISOString();
  const future2 = new Date(Date.now() + 7200_000).toISOString();
  const past = new Date(Date.now() - 3600_000).toISOString();
  const futureEnd1 = new Date(Date.now() + 3600_000 + 1800_000).toISOString();
  const futureEnd2 = new Date(Date.now() + 7200_000 + 1800_000).toISOString();
  const pastEnd = new Date(Date.now() - 1800_000).toISOString();

  const r0 = await call('POST', '/reset', {
    headers: { 'X-API-Key': KEY },
    body: {
      slots: [
        { id: 's1', provider: 'Dr Ade', start: future1, end: futureEnd1 },
        { id: 's2', provider: 'Dr Ade', start: future2, end: futureEnd2 },
        { id: 's3', provider: 'Dr Bello', start: past, end: pastEnd },
        { id: 's-race', provider: 'Dr Bello', start: future1, end: futureEnd1 },
      ],
    },
  });
  check('reset returns 200', r0.status === 200, r0);

  console.log('\n--- Level 2: auth ---');
  const noKey = await fetch(BASE + '/slots');
  check('missing API key -> 401', noKey.status === 401);
  const badKey = await fetch(BASE + '/slots', { headers: { 'X-API-Key': 'wrong' } });
  check('wrong API key -> 401', badKey.status === 401);

  console.log('\n--- Level 1: list & book & lookup ---');
  const list = await call('GET', '/slots', { headers: { 'X-API-Key': KEY } });
  check('list slots 200', list.status === 200, list.json);
  check('slots sorted earliest first', new Date(list.json.slots[0].start) <= new Date(list.json.slots[1].start));
  check('s1 marked available', list.json.slots.find((s) => s.id === 's1').available === true);

  const filtered = await call('GET', '/slots?provider=Dr%20Bello', { headers: { 'X-API-Key': KEY } });
  check('provider filter works', filtered.json.slots.every((s) => s.provider === 'Dr Bello'), filtered.json);

  const book1 = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's1', name: '  Ada Obi  ', email: '  Ada@Example.com ' },
  });
  check('book returns 201', book1.status === 201, book1.json);
  check('status confirmed', book1.json && book1.json.status === 'confirmed');
  check('name trimmed', book1.json && book1.json.name === 'Ada Obi');
  check('email trimmed + lowercased', book1.json && book1.json.email === 'ada@example.com');

  const lookup = await call('GET', `/bookings/${book1.json.id}`, { headers: { 'X-API-Key': KEY } });
  check('lookup booking 200', lookup.status === 200 && lookup.json.id === book1.json.id);

  const lookupMissing = await call('GET', '/bookings/does-not-exist', { headers: { 'X-API-Key': KEY } });
  check('lookup missing booking -> 404', lookupMissing.status === 404);

  console.log('\n--- Level 2: validation ---');
  const missingField = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's2', name: 'No Email' },
  });
  check('missing email -> 400', missingField.status === 400, missingField.json);

  const badEmail = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's2', name: 'Bad Email', email: 'not-an-email' },
  });
  check('invalid email -> 400', badEmail.status === 400, badEmail.json);

  const noSlot = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 'nope', name: 'Ghost', email: 'ghost@example.com' },
  });
  check('unknown slot -> 404', noSlot.status === 404, noSlot.json);

  const pastSlot = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's3', name: 'Time Traveler', email: 'tt@example.com' },
  });
  check('already-started slot -> 400', pastSlot.status === 400, pastSlot.json);

  console.log('\n--- Level 3: double booking + cancel ---');
  const doubleBook = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's1', name: 'Second Person', email: 'second@example.com' },
  });
  check('already-booked slot -> 409', doubleBook.status === 409, doubleBook.json);

  const cancel = await call('DELETE', `/bookings/${book1.json.id}`, { headers: { 'X-API-Key': KEY } });
  check('cancel -> 200', cancel.status === 200 && cancel.json.status === 'cancelled', cancel.json);

  const cancelAgain = await call('DELETE', `/bookings/${book1.json.id}`, { headers: { 'X-API-Key': KEY } });
  check('cancel already-cancelled -> 409', cancelAgain.status === 409, cancelAgain.json);

  const afterCancelSlots = await call('GET', '/slots', { headers: { 'X-API-Key': KEY } });
  check('slot freed after cancel', afterCancelSlots.json.slots.find((s) => s.id === 's1').available === true);

  const rebookAfterCancel = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 's1', name: 'New Patient', email: 'newpatient@example.com' },
  });
  check('freed slot can be rebooked', rebookAfterCancel.status === 201, rebookAfterCancel.json);

  console.log('\n--- Level 3: concurrency (the real test) ---');
  const racers = Array.from({ length: 20 }, (_, i) =>
    call('POST', '/bookings', {
      headers: { 'X-API-Key': KEY },
      body: { slot_id: 's-race', name: `Racer ${i}`, email: `racer${i}@example.com` },
    }),
  );
  const results = await Promise.all(racers);
  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  check(
    'exactly one of 20 concurrent bookings wins',
    successes.length === 1 && conflicts.length === 19,
    { successes: successes.length, conflicts: conflicts.length, other: results.filter((r) => r.status !== 201 && r.status !== 409) },
  );

  console.log('\n--- Level 4: idempotency ---');
  const idemKey = 'idem-key-1';
  const idemBody = { slot_id: 's2', name: 'Idem Person', email: 'idem@example.com' };
  const first = await call('POST', '/bookings', { headers: { 'X-API-Key': KEY, 'Idempotency-Key': idemKey }, body: idemBody });
  check('first idempotent request -> 201', first.status === 201, first.json);

  const replay = await call('POST', '/bookings', { headers: { 'X-API-Key': KEY, 'Idempotency-Key': idemKey }, body: idemBody });
  check('replay same key+body -> same status', replay.status === first.status);
  check('replay same key+body -> same booking id', replay.json.id === first.json.id, { replay: replay.json, first: first.json });

  const bookingsAfterReplay = await call('GET', `/bookings?email=idem@example.com`, { headers: { 'X-API-Key': KEY } });
  check('replay did not create a second booking', bookingsAfterReplay.json.bookings.length === 1, bookingsAfterReplay.json);

  const differentBody = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY, 'Idempotency-Key': idemKey },
    body: { slot_id: 's2', name: 'Someone Else', email: 'other@example.com' },
  });
  check('same key, different body -> 422', differentBody.status === 422, differentBody.json);

  console.log('\n--- Level 4: pagination ---');
  await call('POST', '/reset', {
    headers: { 'X-API-Key': KEY },
    body: {
      slots: Array.from({ length: 12 }, (_, i) => ({
        id: `p${i}`,
        provider: 'Dr Page',
        start: new Date(Date.now() + (i + 1) * 3600_000).toISOString(),
        end: new Date(Date.now() + (i + 1) * 3600_000 + 1800_000).toISOString(),
      })),
    },
  });
  // Insert the 12 fixture bookings directly in the DB rather than through
  // POST /bookings -- going through the real endpoint 12 times for one
  // email would walk straight into the Level 5 rate limit (by design,
  // tested separately below). Pagination and rate limiting are separate
  // concerns; this isolates the pagination test from the rate limiter.
  for (let i = 0; i < 12; i++) {
    await pool.query(
      `INSERT INTO bookings (id, slot_id, name, email, email_lower, status, created_at)
       VALUES ($1, $2, $3, $4, $4, 'confirmed', now() + ($5 || ' milliseconds')::interval)`,
      [`pg_${i}`, `p${i}`, `Page Person ${i}`, 'pager@example.com', String(i * 10)],
    );
  }
  const page1 = await call('GET', '/bookings?email=pager@example.com&limit=5', { headers: { 'X-API-Key': KEY } });
  check('page 1 has 5 bookings', page1.json.bookings.length === 5, page1.json);
  check('page 1 has next_cursor', !!page1.json.next_cursor);
  const page2 = await call('GET', `/bookings?email=pager@example.com&limit=5&cursor=${encodeURIComponent(page1.json.next_cursor)}`, { headers: { 'X-API-Key': KEY } });
  check('page 2 has 5 bookings', page2.json.bookings.length === 5, page2.json);
  const page3 = await call('GET', `/bookings?email=pager@example.com&limit=5&cursor=${encodeURIComponent(page2.json.next_cursor)}`, { headers: { 'X-API-Key': KEY } });
  check('page 3 has 2 bookings', page3.json.bookings.length === 2, page3.json);
  check('page 3 is the last page', page3.json.next_cursor === null, page3.json);
  const ids = [...page1.json.bookings, ...page2.json.bookings, ...page3.json.bookings].map((b) => b.id);
  check('no duplicate/missing ids across pages', new Set(ids).size === 12);

  const badLimit = await call('GET', '/bookings?email=pager@example.com&limit=999', { headers: { 'X-API-Key': KEY } });
  check('limit out of range -> 400', badLimit.status === 400, badLimit.json);
  const emailCaseInsensitive = await call('GET', '/bookings?email=PAGER@EXAMPLE.COM', { headers: { 'X-API-Key': KEY } });
  check('email match is case-insensitive', emailCaseInsensitive.json.bookings.length > 0);

  console.log('\n--- Level 5: rate limiting ---');
  await call('POST', '/reset', {
    headers: { 'X-API-Key': KEY },
    body: {
      slots: Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        provider: 'Dr Rate',
        start: new Date(Date.now() + (i + 1) * 3600_000).toISOString(),
        end: new Date(Date.now() + (i + 1) * 3600_000 + 1800_000).toISOString(),
      })),
    },
  });
  const rateEmail = 'ratelimited@example.com';
  const attempts = [];
  for (let i = 0; i < 6; i++) {
    // mix valid and invalid slot ids -- failed attempts should still count
    attempts.push(
      await call('POST', '/bookings', {
        headers: { 'X-API-Key': KEY },
        body: { slot_id: `r${i}`, name: 'Spammer', email: rateEmail },
      }),
    );
  }
  check('first 5 attempts not rate limited', attempts.slice(0, 5).every((r) => r.status !== 429), attempts.slice(0, 5).map((r) => r.status));
  check('6th attempt -> 429', attempts[5].status === 429, attempts[5].json);
  check('429 has Retry-After header', attempts[5].headers.get('retry-after') !== null, attempts[5].headers.get('retry-after'));

  const otherEmailDuringLimit = await call('POST', '/bookings', {
    headers: { 'X-API-Key': KEY },
    body: { slot_id: 'r9', name: 'Unrelated', email: 'unaffected@example.com' },
  });
  check('other email unaffected by first email being limited', otherEmailDuringLimit.status !== 429, otherEmailDuringLimit.json);

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  await pool.end();
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
