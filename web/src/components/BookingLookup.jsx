import { useEffect, useState } from "react";
import { api } from "../api.js";
import { fullTimestamp, initials, isEmail, shortRef } from "../format.js";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import RefChip from "./RefChip.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import EmptyState, { Alert } from "./EmptyState.jsx";
import { PageLoader } from "./Spinner.jsx";
import { MailIcon, SearchIcon, HashIcon, CalendarIcon } from "./Icons.jsx";

// Shared cancel flow for both tabs: pick a booking, confirm in a modal, call the API.
function useCancel(onDone) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.cancelBooking(target.id);
      onDone(updated);
      setTarget(null);
    } catch (err) {
      if (err.status === 409) {
        // Already cancelled elsewhere: just show it as cancelled.
        onDone({ ...target, status: "cancelled" });
        setTarget(null);
      } else if (err.status === 404) {
        setError("This booking no longer exists.");
      } else {
        setError(err.message || "Could not cancel this booking.");
      }
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setTarget(null);
    setError(null);
  }

  function ask(booking) {
    setError(null);
    setTarget(booking);
  }

  return { target, busy, error, ask, confirm, close };
}

function CancelModal({ cancel }) {
  return (
    <ConfirmModal
      open={Boolean(cancel.target)}
      title="Cancel this appointment?"
      confirmLabel="Yes, cancel booking"
      loadingLabel="Cancelling…"
      cancelLabel="Keep booking"
      loading={cancel.busy}
      error={cancel.error}
      onConfirm={cancel.confirm}
      onCancel={cancel.close}
    >
      {cancel.target && (
        <>
          Booking <span className="font-mono text-ink">{shortRef(cancel.target.id)}</span> for <span className="font-medium text-ink">{cancel.target.name}</span> will be
          cancelled and the slot will be open to other patients. This can't be undone.
        </>
      )}
    </ConfirmModal>
  );
}

function Tabs({ value, onChange }) {
  const tabs = [
    ["email", "By email"],
    ["id", "By reference"],
  ];
  return (
    <div role="tablist" className="inline-flex rounded-full bg-ink/5 p-1">
      {tabs.map(([key, text]) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${value === key ? "bg-white text-primary-dark shadow-soft" : "text-ink/60 hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const ok = status === "confirmed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        ok ? "bg-primary-light text-primary-dark" : "bg-ink/5 text-ink/60"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-primary" : "bg-ink/30"}`} />
      {status}
    </span>
  );
}

function BookingCard({ booking, slot, onCancel }) {
  const cancelled = booking.status === "cancelled";
  return (
    <li className={`overflow-hidden rounded-2xl border bg-white shadow-soft ${cancelled ? "border-line/70 opacity-80" : "border-line"}`}>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary-dark">
            {slot ? initials(slot.provider) : "•"}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-serif text-xl text-ink">{slot ? slot.provider : "Appointment"}</h3>
            {slot && <p className="mt-0.5 text-sm text-ink/65">{fullTimestamp(slot.start)}</p>}
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Tear line, like the perforation on a paper appointment slip */}
      <div className="relative border-t border-dashed border-line">
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-paper" aria-hidden="true" />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-paper" aria-hidden="true" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-5 pt-4">
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-ink/50">Booked for</dt>
            <dd className="text-ink">{booking.name}</dd>
          </div>
          <div>
            <dt className="mb-0.5 text-ink/50">Reference</dt>
            <dd>
              <RefChip id={booking.id} />
            </dd>
          </div>
          <div>
            <dt className="text-ink/50">Booked on</dt>
            <dd className="text-ink">{fullTimestamp(booking.created_at)}</dd>
          </div>
        </dl>
        {!cancelled && (
          <Button size="sm" variant="danger" onClick={() => onCancel(booking)}>
            Cancel booking
          </Button>
        )}
      </div>
    </li>
  );
}

function ByIdPanel({ onCancelled, slotsById }) {
  const [id, setId] = useState("");
  const [idError, setIdError] = useState(null);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const cancel = useCancel((updated) => {
    setResult(updated);
    if (onCancelled) onCancelled(updated);
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!id.trim()) {
      setIdError("Enter your booking reference.");
      return;
    }
    setIdError(null);
    setLoading(true);
    setError(null);
    setResult(null);
    setNotFound(false);
    try {
      setResult(await api.getBooking(id.trim()));
    } catch (err) {
      if (err.status === 404) setNotFound(true);
      else setError(err.message || "Could not look up that booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field
          className="flex-1"
          icon={<HashIcon size={18} />}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. bk_k7m2x9qpa4"
          aria-label="Booking reference"
          error={idError}
        />
        <Button type="submit" loading={loading} loadingText="Looking up…" className="sm:w-36">
          Look up
        </Button>
      </form>

      <div className="mt-6">
        {loading && <PageLoader label="Looking up your booking…" />}
        {error && <Alert>{error}</Alert>}
        {notFound && !loading && (
          <EmptyState icon={<SearchIcon size={22} />} title="No booking found">
            We couldn't find a booking with that reference. Check it and try again.
          </EmptyState>
        )}
        {result && !loading && (
          <ul className="space-y-4">
            <BookingCard booking={result} slot={slotsById[result.slot_id]} onCancel={cancel.ask} />
          </ul>
        )}
      </div>

      <CancelModal cancel={cancel} />
    </div>
  );
}

function ByEmailPanel({ onCancelled, slotsById }) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [searchedEmail, setSearchedEmail] = useState("");
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);

  const cancel = useCancel((updated) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (onCancelled) onCancelled(updated);
  });

  async function search(e) {
    e.preventDefault();
    if (!isEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setLoading(true);
    setError(null);
    setSearched(true);
    setBookings([]);
    setCursor(null);
    setSearchedEmail(email.trim());
    try {
      const page = await api.listBookings(email.trim());
      setBookings(page.bookings);
      setCursor(page.next_cursor);
    } catch (err) {
      setError(err.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setMoreLoading(true);
    try {
      const page = await api.listBookings(searchedEmail, { cursor });
      setBookings((prev) => [...prev, ...page.bookings]);
      setCursor(page.next_cursor);
    } catch (err) {
      setError(err.message || "Could not load more bookings.");
    } finally {
      setMoreLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={search} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field
          className="flex-1"
          type="email"
          icon={<MailIcon size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ada@example.com"
          autoComplete="email"
          aria-label="Email address"
          error={emailError}
        />
        <Button type="submit" loading={loading} loadingText="Searching…" className="sm:w-36">
          Search
        </Button>
      </form>

      <div className="mt-6">
        {loading && <PageLoader label="Searching bookings…" />}
        {error && <Alert>{error}</Alert>}

        {!searched && (
          <EmptyState icon={<CalendarIcon size={22} />} title="Find your appointments">
            Enter the email you booked with to see, and cancel, your bookings.
          </EmptyState>
        )}

        {searched && !loading && !error && bookings.length === 0 && (
          <EmptyState icon={<SearchIcon size={22} />} title="No bookings found">
            We couldn't find any bookings for {searchedEmail}. Check the spelling or try another email.
          </EmptyState>
        )}

        {bookings.length > 0 && (
          <>
            <ul className="space-y-4">
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} slot={slotsById[b.slot_id]} onCancel={cancel.ask} />
              ))}
            </ul>
            {cursor && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={loadMore} loading={moreLoading} loadingText="Loading…">
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <CancelModal cancel={cancel} />
    </div>
  );
}

export default function BookingLookup({ onCancelled }) {
  const [tab, setTab] = useState("email");
  const [slotsById, setSlotsById] = useState({});

  // Load slots once so each booking can show its provider and appointment time.
  // If this fails, cards simply fall back to a plain "Appointment" title.
  useEffect(() => {
    let cancelled = false;
    api
      .listSlots()
      .then((data) => {
        if (!cancelled) setSlotsById(Object.fromEntries(data.slots.map((s) => [s.id, s])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="pb-16">
      <h2 className="font-serif text-2xl sm:text-4xl text-ink">Find a booking</h2>
      <p className="mt-1.5 sm:text-base text-[14px] text-ink/60">Look up an appointment by your email or booking reference. You can cancel it from here too.</p>
      <div className="mt-5">
        <Tabs value={tab} onChange={setTab} />
      </div>
      {tab === "email" ? <ByEmailPanel onCancelled={onCancelled} slotsById={slotsById} /> : <ByIdPanel onCancelled={onCancelled} slotsById={slotsById} />}
    </section>
  );
}
