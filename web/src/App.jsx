import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header.jsx';
import SlotList from './components/SlotList.jsx';
import ConfirmationTicket from './components/ConfirmationTicket.jsx';
import BookingLookup from './components/BookingLookup.jsx';
import { api } from './api.js';

export default function App() {
  const [view, setView] = useState('book'); // 'book' | 'lookup'
  const [slots, setSlots] = useState([]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null); // { booking, slot }

  const loadSlots = useCallback(async (providerFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSlots(providerFilter || undefined);
      setSlots(data.slots);
    } catch (err) {
      setError(err.message || 'Could not load appointment slots.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots(provider);
  }, [provider, loadSlots]);

  function handleBooked(booking, takenSlotId) {
    if (!booking) {
      // Someone else took the slot between page load and submit (409).
      // Refresh so the list reflects reality.
      loadSlots(provider);
      return;
    }
    const slot = slots.find((s) => s.id === booking.slot_id);
    setConfirmation({ booking, slot });
    setSlots((prev) => prev.map((s) => (s.id === booking.slot_id ? { ...s, available: false } : s)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (takenSlotId) loadSlots(provider);
  }

  function handleCancelled(updatedBooking) {
    setConfirmation((prev) => (prev ? { ...prev, booking: updatedBooking } : prev));
    loadSlots(provider);
  }

  const providers = [...new Set(slots.map((s) => s.provider))].sort();

  return (
    <div className="min-h-screen">
      <Header view={view} onNavigate={setView} />

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-0">
        {view === 'book' ? (
          <>
            <div className="mb-10">
              <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
                Book your appointment
              </h1>
              <p className="mt-2 max-w-md text-ink/70">
                Pick an open slot below and confirm with your name and email. You'll get a
                booking reference right away.
              </p>
            </div>

            {confirmation && (
              <ConfirmationTicket
                booking={confirmation.booking}
                slot={confirmation.slot}
                onCancelled={handleCancelled}
                onClose={() => setConfirmation(null)}
              />
            )}

            <SlotList
              slots={slots}
              loading={loading}
              error={error}
              providers={providers}
              provider={provider}
              onProviderChange={setProvider}
              onBooked={handleBooked}
            />
          </>
        ) : (
          <BookingLookup />
        )}
      </main>

      <footer className="mx-auto max-w-2xl px-5 pb-10 text-sm text-ink/40 sm:px-0">
        Koya Clinic — appointments booked here are confirmed right away.
      </footer>
    </div>
  );
}
