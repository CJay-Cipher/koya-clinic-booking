import { useState } from "react";
import { api } from "../api.js";
import { fullTimestamp, isEmail } from "../format.js";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import RefChip from "./RefChip.jsx";
import EmptyState, { Alert } from "./EmptyState.jsx";
import { PageLoader } from "./Spinner.jsx";
import { MailIcon, SearchIcon, HashIcon, CalendarIcon } from "./Icons.jsx";

const LIST = "divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white/60 shadow-soft";

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

function BookingCard({ booking }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{booking.name}</p>
        <p className="mt-0.5 text-sm text-ink/55">Booked {fullTimestamp(booking.created_at)}</p>
      </div>
      <div className="flex items-center gap-3">
        <RefChip id={booking.id} />
        <StatusBadge status={booking.status} />
      </div>
    </li>
  );
}

function ByIdPanel() {
  const [id, setId] = useState("");
  const [idError, setIdError] = useState(null);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
          <ul className={LIST}>
            <BookingCard booking={result} />
          </ul>
        )}
      </div>
    </div>
  );
}

function ByEmailPanel() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [searchedEmail, setSearchedEmail] = useState("");
  const [bookings, setBookings] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);

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
            Enter the email you booked with to see all of your bookings.
          </EmptyState>
        )}

        {searched && !loading && !error && bookings.length === 0 && (
          <EmptyState icon={<SearchIcon size={22} />} title="No bookings found">
            We couldn't find any bookings for {searchedEmail}. Check the spelling or try another email.
          </EmptyState>
        )}

        {bookings.length > 0 && (
          <>
            <ul className={LIST}>
              {bookings.map((b) => (
                <BookingCard key={b.id} booking={b} />
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
    </div>
  );
}

export default function BookingLookup() {
  const [tab, setTab] = useState("email");

  return (
    <section className="pb-16">
      <h2 className="font-serif text-3xl text-ink">Find a booking</h2>
      <p className="mt-1.5 text-ink/60">Look up an appointment by your email or booking reference.</p>
      <div className="mt-5">
        <Tabs value={tab} onChange={setTab} />
      </div>
      {tab === "email" ? <ByEmailPanel /> : <ByIdPanel />}
    </section>
  );
}
