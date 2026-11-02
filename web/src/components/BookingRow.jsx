import { useState } from "react";
import { timeRange, initials, isEmail } from "../format.js";
import { api, ApiError } from "../api.js";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import { ClockIcon, UserIcon, MailIcon } from "./Icons.jsx";

export default function BookingRow({ slot, isOpen, onToggle, onBooked }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  const disabled = !slot.available;

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!name.trim()) errors.name = "Please enter your full name.";
    if (!isEmail(email)) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    setRetryAfter(null);
    try {
      // A fresh key per submit protects against a double-click or flaky
      // connection resending the same request, without ever reusing a key
      // across genuinely different bookings.
      const idempotencyKey = crypto.randomUUID();
      const booking = await api.createBooking({ slot_id: slot.id, name: name.trim(), email: email.trim() }, idempotencyKey);
      onBooked(booking);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 429 && err.retryAfter) setRetryAfter(err.retryAfter);
        if (err.status === 409) onBooked(null, slot.id); // slot got taken -- refresh list
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li>
      <div className="flex items-center gap-3 p-4 sm:gap-4">
        <div className="hidden xs:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary-dark">
          {initials(slot.provider)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{slot.provider}</p>
          <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-sm tabular-nums text-ink/60">
            <ClockIcon size={14} />
            {timeRange(slot.start, slot.end)}
          </p>
        </div>
        {disabled ? (
          <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/50">Booked</span>
        ) : (
          <Button size="sm" variant={isOpen ? "ghost" : "outline"} onClick={onToggle} aria-expanded={isOpen}>
            {isOpen ? "Close" : "Book"}
          </Button>
        )}
      </div>

      {isOpen && !disabled && (
        <form onSubmit={handleSubmit} noValidate className="animate-fade-up border-t border-line bg-primary-light/40 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              icon={<UserIcon size={18} />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Obi"
              autoComplete="name"
              error={fieldErrors.name}
            />
            <Field
              label="Email"
              type="email"
              icon={<MailIcon size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
              autoComplete="email"
              error={fieldErrors.email}
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
              {retryAfter ? ` Try again in ${retryAfter}s.` : ""}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" variant="accent" loading={submitting} loadingText="Confirming…">
              Confirm booking
            </Button>
            <Button variant="ghost" onClick={onToggle}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
