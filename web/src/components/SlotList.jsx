import { useMemo, useState } from "react";
import { dayHeading, dayKey } from "../format.js";
import BookingRow from "./BookingRow.jsx";
import Select from "./Select.jsx";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";
import { PageLoader } from "./Spinner.jsx";
import { CalendarIcon, AlertIcon, UserIcon } from "./Icons.jsx";

function SlotSkeleton() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white/60" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-ink/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-36 animate-pulse rounded bg-ink/10" />
          </div>
          <div className="h-9 w-20 animate-pulse rounded-full bg-ink/10" />
        </div>
      ))}
    </div>
  );
}

export default function SlotList({ slots, loading, error, providers, provider, onProviderChange, onBooked, onRetry }) {
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

  const providerOptions = [{ value: "", label: "All providers" }, ...providers.map((p) => ({ value: p, label: p }))];
  const openCount = slots.filter((s) => s.available).length;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">Open appointments</h2>
          {!loading && !error && slots.length > 0 && <p className="mt-0.5 text-sm text-ink/55">{openCount} open</p>}
        </div>
        <Select
          ariaLabel="Filter by provider"
          icon={<UserIcon size={16} />}
          value={provider}
          onChange={onProviderChange}
          options={providerOptions}
          loading={loading}
          align="right"
          className="w-full sm:w-56"
        />
      </div>

      {loading && (
        <>
          <PageLoader label={provider ? `Finding slots for ${provider}…` : "Finding appointments…"} />
          <SlotSkeleton />
        </>
      )}

      {!loading && error && (
        <EmptyState
          tone="danger"
          icon={<AlertIcon size={22} />}
          title="Couldn't load appointments"
          action={
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          }
        >
          {error}
        </EmptyState>
      )}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon={<CalendarIcon size={22} />}
          title={provider ? `No openings for ${provider}` : "No appointments yet"}
          action={
            provider ? (
              <Button variant="outline" onClick={() => onProviderChange("")}>
                Show all providers
              </Button>
            ) : null
          }
        >
          {provider ? "Try another provider or view everyone's availability." : "There are no appointments open right now. Please check back soon."}
        </EmptyState>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.heading}>
              <h3 className="sm:mb-2 mb-1 font-serif text-lg italic text-primary-dark">{group.heading}</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white/60 shadow-soft">
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
      )}
    </section>
  );
}
