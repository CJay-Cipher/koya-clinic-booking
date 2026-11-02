import { useState } from "react";
import { fullTimestamp } from "../format.js";
import { api } from "../api.js";
import Button from "./Button.jsx";
import RefChip from "./RefChip.jsx";
import { CheckIcon } from "./Icons.jsx";

export default function ConfirmationTicket({ booking, slot, onCancelled, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelBooking(booking.id);
      setConfirming(false);
      onCancelled(updated);
    } catch (err) {
      setCancelError(err.message || "Could not cancel this booking.");
    } finally {
      setCancelling(false);
    }
  }

  const cancelled = booking.status === "cancelled";

  return (
    <div className={`relative mb-10 animate-fade-up overflow-hidden rounded-2xl text-paper shadow-lift ${cancelled ? "bg-ink/80" : "bg-primary-dark"}`}>
      <div className="flex items-start justify-between gap-6 p-6">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper/15">
            <CheckIcon size={18} />
          </span>
          <div>
            <p className="font-serif text-sm italic text-paper/70">{cancelled ? "Booking cancelled" : "You're booked"}</p>
            <h3 className="mt-0.5 font-serif text-2xl">{slot ? slot.provider : "Appointment"}</h3>
            {slot && <p className="mt-1 text-sm text-paper/80">{fullTimestamp(slot.start)}</p>}
          </div>
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
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-paper/60">Booked for</dt>
            <dd>{booking.name}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-paper/60">Reference</dt>
            <dd>
              <RefChip id={booking.id} tone="dark" />
            </dd>
          </div>
          <div>
            <dt className="text-paper/60">Status</dt>
            <dd className="capitalize">{booking.status}</dd>
          </div>
        </dl>

        {!cancelled &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-paper/80">Cancel this appointment?</span>
              <Button size="sm" variant="light" loading={cancelling} loadingText="Cancelling…" onClick={handleCancel}>
                Yes, cancel
              </Button>
              <button onClick={() => setConfirming(false)} disabled={cancelling} className="text-paper/70 hover:text-paper">
                Keep it
              </button>
            </div>
          ) : (
            <Button size="sm" variant="light" onClick={() => setConfirming(true)}>
              Cancel booking
            </Button>
          ))}
      </div>
      {cancelError && (
        <p className="px-6 pb-4 text-sm text-red-200" role="alert">
          {cancelError}
        </p>
      )}
    </div>
  );
}
