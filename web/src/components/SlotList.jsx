import { useMemo, useState } from 'react';
import { dayHeading, dayKey } from '../format.js';
import BookingRow from './BookingRow.jsx';

export default function SlotList({ slots, loading, error, providers, provider, onProviderChange, onBooked }) {
  const [openSlotId, setOpenSlotId] = useState(null);

  const groups = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      const key = dayKey(slot.start);
      if (!map.has(key)) map.set(key, { heading: dayHeading(slot.start), slots: [] });
      map.get(key).slots.push(slot);
    }
    return [...map.values()];
  }, [slots]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-ink">Open appointments</h2>
        <label className="text-sm text-ink/70">
          <span className="mr-2">Provider</span>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="rounded border border-line bg-paper px-2 py-1.5"
          >
            <option value="">All</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-ink/60">Loading slots…</p>}
      {error && (
        <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!loading && !error && groups.length === 0 && (
        <p className="rounded border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
          No appointments are open right now. Check back soon, or try a different provider.
        </p>
      )}

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.heading}>
            <h3 className="mb-2 font-serif text-lg italic text-primary-dark">{group.heading}</h3>
            <ul>
              {group.slots.map((slot) => (
                <BookingRow
                  key={slot.id}
                  slot={slot}
                  isOpen={openSlotId === slot.id}
                  onToggle={() => setOpenSlotId(openSlotId === slot.id ? null : slot.id)}
                  onBooked={onBooked}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
