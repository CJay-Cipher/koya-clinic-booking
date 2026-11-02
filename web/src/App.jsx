import { useEffect, useState, useCallback, useRef } from "react";
import Header from "./components/Header.jsx";
import SlotList from "./components/SlotList.jsx";
import ConfirmationTicket from "./components/ConfirmationTicket.jsx";
import BookingLookup from "./components/BookingLookup.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { Alert } from "./components/EmptyState.jsx";
import { api } from "./api.js";

const isAdminPath = () => /^\/admin\/?$/.test(window.location.pathname);

export default function App() {
  const [view, setView] = useState(() => (isAdminPath() ? "admin" : "book")); // 'book' | 'lookup' | 'admin'
  const [slots, setSlots] = useState([]);
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirmation, setConfirmation] = useState(null); // { booking, slot }
  const requestId = useRef(0);

  // silent = refresh in the background without flashing the loader.
  const loadSlots = useCallback(async (providerFilter, { silent = false } = {}) => {
    const id = ++requestId.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.listSlots(providerFilter || undefined);
      if (id !== requestId.current) return; // a newer request superseded this one
      setSlots(data.slots);
      const names = data.slots.map((s) => s.provider);
      // The provider list must not shrink when a filter is applied.
      setProviders((prev) => (providerFilter ? [...new Set([...prev, ...names])].sort() : [...new Set(names)].sort()));
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || "Could not load appointment slots.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots(provider);
  }, [provider, loadSlots]);

  // Keep the view in sync with the browser's back/forward buttons.
  useEffect(() => {
    function onPop() {
      setView((v) => (isAdminPath() ? "admin" : v === "admin" ? "book" : v));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(next) {
    const path = next === "admin" ? "/admin" : "/";
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setView(next);
    window.scrollTo({ top: 0 });
    if (next === "book") loadSlots(provider, { silent: true }); // pick up any admin changes
  }

  function handleBooked(booking) {
    if (!booking) {
      // Someone else took the slot between page load and submit (409).
      setNotice("Sorry, that slot was just taken. The list has been refreshed.");
      loadSlots(provider, { silent: true });
      return;
    }
    setNotice(null);
    const slot = slots.find((s) => s.id === booking.slot_id);
    setConfirmation({ booking, slot });
    setSlots((prev) => prev.map((s) => (s.id === booking.slot_id ? { ...s, available: false } : s)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelled(updatedBooking) {
    setConfirmation((prev) => (prev ? { ...prev, booking: updatedBooking } : prev));
    loadSlots(provider, { silent: true });
  }

  return (
    <div className="relative isolate min-h-screen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--color-primary)/0.09),transparent)]"
        aria-hidden="true"
      />
      <Header view={view} onNavigate={navigate} />

      <main className="mx-auto max-w-3xl px-5 py-10">
        <div key={view} className="animate-fade-up">
          {view === "book" && (
            <>
              <div className="mb-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Confirmed instantly
                </span>
                <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">Book your appointment</h1>
                <p className="mt-3 max-w-md text-lg text-ink/65">
                  Pick an open slot below and confirm with your name and email. You'll get a booking reference right away.
                </p>
              </div>

              {confirmation && (
                <ConfirmationTicket booking={confirmation.booking} slot={confirmation.slot} onCancelled={handleCancelled} onClose={() => setConfirmation(null)} />
              )}

              {notice && (
                <div className="mb-6">
                  <Alert tone="warn" onClose={() => setNotice(null)}>
                    {notice}
                  </Alert>
                </div>
              )}

              <SlotList
                slots={slots}
                loading={loading}
                error={error}
                providers={providers}
                provider={provider}
                onProviderChange={setProvider}
                onBooked={handleBooked}
                onRetry={() => loadSlots(provider)}
              />
            </>
          )}
          {view === "lookup" && <BookingLookup />}
          {view === "admin" && <AdminPanel />}
        </div>
      </main>

      <footer className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-5 pb-10 text-sm text-ink/40">
        <span>Koya Clinic — appointments booked here are confirmed right away.</span>
        <a
          href="/admin"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return; // allow open-in-new-tab
            e.preventDefault();
            navigate("admin");
          }}
          className="transition text-primary hover:text-primary-dark"
        >
          Staff login
        </a>
      </footer>
    </div>
  );
}
