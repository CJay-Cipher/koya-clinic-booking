import { useState } from 'react';
import { timeRange } from '../format.js';
import { api, ApiError } from '../api.js';

export default function BookingRow({ slot, isOpen, onToggle, onBooked }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  const disabled = !slot.available;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setRetryAfter(null);
    try {
      // A fresh key per submit: this protects against a double-click or a
      // flaky connection causing the browser to resend the exact same
      // request, without ever reusing a key across genuinely different
      // bookings.
      const idempotencyKey = crypto.randomUUID();
      const booking = await api.createBooking(
        { slot_id: slot.id, name, email },
        idempotencyKey,
      );
      onBooked(booking);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 429 && err.retryAfter) setRetryAfter(err.retryAfter);
        if (err.status === 409) onBooked(null, slot.id); // slot got taken -- refresh list
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-4 py-4">
        <div className="w-24 shrink-0 text-sm tabular-nums text-ink/70">
          {timeRange(slot.start, slot.end)}
        </div>
        <div className="flex-1 text-[15px]">{slot.provider}</div>
        {disabled ? (
          <span className="text-sm text-ink/40">Booked</span>
        ) : (
          <button
            onClick={onToggle}
            className="rounded-full border border-primary px-4 py-1.5 text-sm text-primary-dark transition hover:bg-primary hover:text-paper"
            aria-expanded={isOpen}
          >
            {isOpen ? 'Close' : 'Book'}
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <form onSubmit={handleSubmit} className="mb-5 ml-0 rounded-md bg-primary-light/60 p-4 sm:ml-28">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-ink/70">Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-line bg-paper px-3 py-2 text-[15px] focus:border-primary"
                placeholder="Ada Obi"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink/70">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-line bg-paper px-3 py-2 text-[15px] focus:border-primary"
                placeholder="ada@example.com"
              />
            </label>
          </div>

          {error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
              {retryAfter ? ` Try again in ${retryAfter}s.` : ''}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-accent px-5 py-1.5 text-sm font-medium text-paper transition hover:bg-accent-dark disabled:opacity-60"
            >
              {submitting ? 'Confirming…' : 'Confirm booking'}
            </button>
            <button type="button" onClick={onToggle} className="text-sm text-ink/60 hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
