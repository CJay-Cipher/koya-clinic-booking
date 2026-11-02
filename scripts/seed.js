// Posts a handful of sample slots to the local API via POST /reset, so the
// UI has something to show. Run this AFTER the API server is already
// running (npm run test:local-api, or `vercel dev`).
require('dotenv').config();

const BASE = process.env.SEED_BASE_URL || 'http://localhost:3333';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('API_KEY is not set. Fill it in your .env file first.');
  process.exit(1);
}

function inDays(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const providers = ['Dr Ade', 'Dr Bello', 'Dr Chukwu'];
const slots = [];
let n = 0;
for (let day = 1; day <= 4; day++) {
  for (const hour of [9, 10, 11, 14, 15]) {
    n++;
    slots.push({
      id: `s${n}`,
      provider: providers[n % providers.length],
      start: inDays(day, hour),
      end: inDays(day, hour) /* fixed below */,
    });
  }
}
// give each slot a real 30-minute end time
for (const slot of slots) {
  const end = new Date(slot.start);
  end.setMinutes(end.getMinutes() + 30);
  slot.end = end.toISOString();
}

async function main() {
  const res = await fetch(`${BASE}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ slots }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`Seed failed (${res.status}):`, body);
    process.exit(1);
  }
  console.log(`Seeded ${slots.length} slots across ${providers.length} providers.`);
  console.log('Reload the web app and they should appear under "Open appointments".');
}

main().catch((err) => {
  console.error('Could not reach the API at', BASE);
  console.error('Make sure the API server is running first (npm run test:local-api, or vercel dev).');
  console.error(err.message);
  process.exit(1);
});
