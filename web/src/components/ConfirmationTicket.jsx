import { useState } from 'react';
import { fullTimestamp } from '../format.js';
import { api } from '../api.js';

export default function ConfirmationTicket({ booking, slot, onCancelled, onClose }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelBooking(booking.id);
      onCancelled(updated);
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this booking.');
    } finally {
      setCancelling(false);
    }
  }

  const cancelled = booking.status === 'cancelled';

  return (
    <div className="relative mb-10 overflow-hidden rounded-lg border border-primary/20 bg-primary-dark text-paper shadow-sm">
      <div className="flex items-start justify-between gap-6 p-6">
        <div>
          <p className="font-serif text-sm italic text-paper/70">
            {cancelled ? 'Booking cancelled' : "You're booked"}
          </p>
          <h3 className="mt-1 font-serif text-2xl">{slot ? slot.provider : 'Appointment'}</h3>
          {slot && <p className="mt-1 text-sm text-paper/80">{fullTimestamp(slot.start)}</p>}
        </div>
        <button onClick={onClose} className="text-sm text-paper/70 hover:text-paper" aria-label="Dismiss">
          Dismiss
        </button>
      </div>

      {/* Tear line, like the perforation on a paper appointment slip */}
      <div className="relative border-t border-dashed border-paper/30">
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-paper" aria-hidden="true" />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-paper" aria-hidden="true" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-6 pt-5">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-paper/60">Booked for</dt>
            <dd>{booking.name}</dd>
          </div>
          <div>
            <dt className="text-paper/60">Reference</dt>
            <dd className="font-mono text-[13px]">{booking.id}</dd>
          </div>
          <div>
            <dt className="text-paper/60">Status</dt>
            <dd className="capitalize">{booking.status}</dd>
          </div>
        </dl>

        {!cancelled && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-full border border-paper/40 px-4 py-1.5 text-sm transition hover:bg-paper hover:text-primary-dark disabled:opacity-60"
          >
            {cancelling ? 'Cancelling…' : 'Cancel this booking'}
          </button>
        )}
      </div>
      {cancelError && (
        <p className="px-6 pb-4 text-sm text-red-200" role="alert">
          {cancelError}
        </p>
      )}
    </div>
  );
}
