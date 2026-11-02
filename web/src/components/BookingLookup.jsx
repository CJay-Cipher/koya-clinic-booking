import { useState } from 'react';
import { api } from '../api.js';
import { fullTimestamp } from '../format.js';

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-sm transition ${
        active ? 'border-primary text-primary-dark' : 'border-transparent text-ink/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function BookingCard({ booking }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line py-3 text-sm last:border-b-0">
      <div>
        <p className="text-ink">{booking.name}</p>
        <p className="text-ink/50">{fullTimestamp(booking.created_at)} · booked</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs text-ink/60">{booking.id}</p>
        <p className="capitalize text-ink/80">{booking.status}</p>
      </div>
    </li>
  );
}

function ByIdPanel() {
  const [id, setId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.getBooking(id.trim()));
    } catch (err) {
      setError(err.message || 'Booking not found.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5">
      <div className="flex gap-2">
        <input
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. bk_3f1c...  "
          className="flex-1 rounded border border-line bg-paper px-3 py-2 text-[15px] focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-paper transition hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {result && (
        <ul className="mt-4 rounded border border-line">
          <BookingCard booking={result} />
        </ul>
      )}
    </form>
  );
}

function ByEmailPanel() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const page = await api.listBookings(email.trim());
      setBookings(page.bookings);
      setCursor(page.next_cursor);
    } catch (err) {
      setError(err.message || 'Could not load bookings.');
      setBookings([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoading(true);
    try {
      const page = await api.listBookings(email.trim(), { cursor });
      setBookings((prev) => [...prev, ...page.bookings]);
      setCursor(page.next_cursor);
    } catch (err) {
      setError(err.message || 'Could not load more bookings.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <form onSubmit={search} className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ada@example.com"
          className="flex-1 rounded border border-line bg-paper px-3 py-2 text-[15px] focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-paper transition hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {searched && !error && bookings.length === 0 && !loading && (
        <p className="mt-4 text-sm text-ink/60">No bookings found for that email.</p>
      )}

      {bookings.length > 0 && (
        <>
          <ul className="mt-4 rounded border border-line">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </ul>
          {cursor && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="mt-3 text-sm text-primary-dark underline decoration-line decoration-1 underline-offset-4 hover:decoration-primary disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function BookingLookup() {
  const [tab, setTab] = useState('email');

  return (
    <section className="mx-auto max-w-2xl px-5 pb-24 sm:px-0">
      <h2 className="font-serif text-2xl text-ink">Find a booking</h2>
      <div className="mt-4 flex gap-6 border-b border-line">
        <Tab active={tab === 'email'} onClick={() => setTab('email')}>
          By email
        </Tab>
        <Tab active={tab === 'id'} onClick={() => setTab('id')}>
          By reference
        </Tab>
      </div>
      {tab === 'email' ? <ByEmailPanel /> : <ByIdPanel />}
    </section>
  );
}
