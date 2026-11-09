import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api.js";
import { dayHeading, dayKey, timeRange, localDate, localTime, durationMinutes, toIso, ymd } from "../format.js";
import Button from "./Button.jsx";
import Field from "./Field.jsx";
import Select from "./Select.jsx";
import DatePicker from "./DatePicker.jsx";
import EmptyState, { Alert } from "./EmptyState.jsx";
import { PageLoader } from "./Spinner.jsx";
import { CalendarIcon, AlertIcon, LockIcon, PlusIcon, PencilIcon, TrashIcon, UserIcon } from "./Icons.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

const STORAGE_KEY = "koya_admin_key";
const readKey = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};
const writeKey = (v) => {
  try {
    if (v) sessionStorage.setItem(STORAGE_KEY, v);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const pad = (n) => String(n).padStart(2, "0");
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const hmLabel = (hm) => {
  const [h, m] = hm.split(":").map(Number);
  return timeFmt.format(new Date(2000, 0, 1, h, m));
};
const BASE_TIMES = [];
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 21 && m > 0) break;
    BASE_TIMES.push(`${pad(h)}:${pad(m)}`);
  }
}
const BASE_DURATIONS = [15, 30, 45, 60, 90];
const withExtra = (list, v) => (list.includes(v) ? list : [...list, v].sort((a, b) => (a < b ? -1 : 1)));

// ---- Gate: asks for the admin key -------------------------------------------
function AdminGate({ onUnlock, message }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState(message || null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!key.trim()) {
      setError("Enter the admin key.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Deliberately invalid body: a correct key answers 400 (validation),
      // a wrong key answers 403. Nothing is ever created by this call.
      await api.createSlot(key.trim(), {});
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        onUnlock(key.trim());
        return;
      }
      if (err.status === 403) setError("That admin key is not valid.");
      else if (err.status === 429) setError(`Too many attempts. Try again in ${err.retryAfter || 60}s.`);
      else setError(err.message || "Could not verify the key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm pb-16 pt-6 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <LockIcon size={22} />
      </span>
      <h2 className="font-serif text-2xl text-ink">Staff access</h2>
      <p className="mt-1.5 text-sm text-ink/60">Enter the admin key to manage appointment slots.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-3 text-left">
        <Field
          type="password"
          icon={<LockIcon size={18} />}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          autoComplete="off"
          aria-label="Admin key"
          error={error}
        />
        <Button type="submit" loading={loading} loadingText="Checking…" className="w-full">
          Unlock
        </Button>
      </form>
    </section>
  );
}

// ---- Create / edit form ----------------------------------------------------
function SlotForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [provider, setProvider] = useState(initial ? initial.provider : "");
  const [date, setDate] = useState(initial ? localDate(initial.start) : "");
  const [time, setTime] = useState(initial ? localTime(initial.start) : "09:00");
  const [duration, setDuration] = useState(initial ? durationMinutes(initial.start, initial.end) : 30);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const timeOptions = withExtra(BASE_TIMES, time).map((v) => ({ value: v, label: hmLabel(v) }));
  const durationOptions = withExtra(BASE_DURATIONS, duration).map((v) => ({ value: v, label: `${v} min` }));

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!provider.trim()) next.provider = "Provider is required.";
    if (!date) next.date = "Pick a date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        provider: provider.trim(),
        start: toIso(date, time),
        end: toIso(date, time, duration),
      });
    } catch (err) {
      setFormError(err.message || "Could not save this slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 sm:gap-4 gap-3 sm:grid-cols-3">
        <Field
          className="col-span-2 sm:col-span-3"
          label="Provider"
          icon={<UserIcon size={18} />}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Dr Ade"
          error={errors.provider}
        />
        <DatePicker className="col-span-2 sm:col-span-1" label="Date" value={date} onChange={setDate} min={initial ? undefined : ymd(new Date())} error={errors.date} />
        <Select label="Start time" value={time} onChange={setTime} options={timeOptions} />
        <Select label="Duration" value={duration} onChange={setDuration} options={durationOptions} />
      </div>
      {formError && (
        <div className="mt-4">
          <Alert>{formError}</Alert>
        </div>
      )}
      <div className="mt-5 flex items-center gap-2">
        <Button type="submit" loading={saving} loadingText="Saving…">
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---- One slot row ------------------------------------------------------------
function SlotRow({ slot, editing, onEdit, onCancelEdit, onSave, onAskDelete }) {
  const past = new Date(slot.start).getTime() <= Date.now();
  const status = past ? "Past" : slot.available ? "Open" : "Booked";
  const chip = {
    Open: "bg-primary-light text-primary-dark",
    Booked: "bg-accent/15 text-accent-dark",
    Past: "bg-ink/5 text-ink/50",
  }[status];
  const locked = !slot.available;

  if (editing) {
    return (
      <li className="relative z-20 animate-fade-up bg-primary-light/30 p-4 first:rounded-t-2xl last:rounded-b-2xl sm:p-5">
        <SlotForm initial={slot} submitLabel="Save changes" onSubmit={onSave} onCancel={onCancelEdit} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{slot.provider}</p>
        <p className="mt-0.5 whitespace-nowrap text-sm tabular-nums text-ink/60">{timeRange(slot.start, slot.end)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>{status}</span>
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={locked} title={locked ? "Has a confirmed booking" : "Edit slot"}>
          <PencilIcon size={15} /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onAskDelete} disabled={locked} title={locked ? "Has a confirmed booking" : "Delete slot"}>
          <TrashIcon size={15} /> Delete
        </Button>
      </div>
    </li>
  );
}

// ---- Panel ---------------------------------------------------------------------
export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [gateMsg, setGateMsg] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [provider, setProvider] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.listSlots();
      setSlots(data.slots);
    } catch (err) {
      setError(err.message || "Could not load slots.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) load();
  }, [adminKey, load]);

  const providers = useMemo(() => [...new Set(slots.map((s) => s.provider))].sort(), [slots]);
  // If the chosen provider no longer has slots (e.g. the last one was deleted), fall back to all.
  const activeProvider = providers.includes(provider) ? provider : "";
  const providerOptions = [{ value: "", label: "All providers" }, ...providers.map((p) => ({ value: p, label: p }))];

  const groups = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      if (activeProvider && slot.provider !== activeProvider) continue;
      const key = dayKey(slot.start);
      if (!map.has(key)) map.set(key, { heading: dayHeading(slot.start), slots: [] });
      map.get(key).slots.push(slot);
    }
    return [...map.values()];
  }, [slots, activeProvider]);
  const visibleCount = groups.reduce((n, g) => n + g.slots.length, 0);

  function lock(message) {
    writeKey("");
    setAdminKey("");
    setGateMsg(message || null);
    setCreating(false);
    setEditingId(null);
    setDeleteTarget(null);
  }
  function unlock(key) {
    writeKey(key);
    setGateMsg(null);
    setAdminKey(key);
  }

  // Wraps an admin call: a 403 means the key is no longer accepted -> back to the gate.
  async function run(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        lock("Your admin key was rejected. Please enter it again.");
        return undefined;
      }
      throw err;
    }
  }

  async function handleCreate(payload) {
    await run(async () => {
      await api.createSlot(adminKey, payload);
      setCreating(false);
      await load({ silent: true });
    });
  }

  async function handleUpdate(id, payload) {
    await run(async () => {
      await api.updateSlot(adminKey, id, payload);
      setEditingId(null);
      await load({ silent: true });
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await run(async () => {
        await api.deleteSlot(adminKey, deleteTarget.id);
        setDeleteTarget(null);
        await load({ silent: true });
      });
    } catch (err) {
      // Error stays visible inside the modal; refresh so the row reflects reality
      // (e.g. the slot was booked a moment ago).
      setActionError(err.message || "Could not delete this slot.");
      load({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  if (!adminKey) return <AdminGate onUnlock={unlock} message={gateMsg} />;

  return (
    <section className="sm:pb-16 pb-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-4xl text-ink">Manage slots</h2>
          <p className="mt-1.5 sm:text-lg text-[14px] text-ink/60">Add, edit or remove appointment slots. Booked slots are locked.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => lock()}>
            <LockIcon size={15} /> Lock
          </Button>
          {!creating && (
            <Button
              size="sm"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
            >
              <PlusIcon size={16} /> New slot
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <div className="relative z-20 mb-8 animate-fade-up rounded-2xl border border-line bg-white/70 p-5 shadow-soft">
          <h3 className="mb-4 font-serif text-lg text-ink">New slot</h3>
          <SlotForm submitLabel="Create slot" onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink/55">
            {visibleCount} {visibleCount === 1 ? "slot" : "slots"}
            {activeProvider ? ` for ${activeProvider}` : ""}
          </p>
          <Select
            ariaLabel="Filter by provider"
            icon={<UserIcon size={16} />}
            value={activeProvider}
            onChange={setProvider}
            options={providerOptions}
            align="right"
            className="w-full sm:w-56"
          />
        </div>
      )}

      {loading && <PageLoader label="Loading slots…" />}

      {!loading && error && (
        <EmptyState
          tone="danger"
          icon={<AlertIcon size={22} />}
          title="Couldn't load slots"
          action={
            <Button variant="outline" onClick={() => load()}>
              Try again
            </Button>
          }
        >
          {error}
        </EmptyState>
      )}

      {!loading && !error && groups.length === 0 && !creating && (
        <EmptyState icon={<CalendarIcon size={22} />} title="No slots yet" action={<Button onClick={() => setCreating(true)}>Add the first slot</Button>}>
          Patients will see slots here once you create them.
        </EmptyState>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.heading}>
              <h3 className="sm:mb-2 mb-1 font-serif text-lg italic text-primary-dark">{group.heading}</h3>
              {/* No overflow-hidden here: the edit form's dropdowns must not be clipped. */}
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white/60 shadow-soft">
                {group.slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    editing={editingId === slot.id}
                    onEdit={() => {
                      setEditingId(slot.id);
                      setCreating(false);
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(payload) => handleUpdate(slot.id, payload)}
                    onAskDelete={() => {
                      setActionError(null);
                      setDeleteTarget(slot);
                    }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this slot?"
        confirmLabel="Delete slot"
        loadingLabel="Deleting…"
        loading={busyId !== null}
        error={actionError}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setActionError(null);
        }}
      >
        {deleteTarget && (
          <>
            <span className="font-medium text-ink">{deleteTarget.provider}</span>
            {" · "}
            {dayHeading(deleteTarget.start)}, {timeRange(deleteTarget.start, deleteTarget.end)} will be removed permanently, and patients will no longer see it.
          </>
        )}
      </ConfirmModal>
    </section>
  );
}
