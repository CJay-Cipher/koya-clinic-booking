import { useEffect, useRef, useState } from "react";
import { ymd } from "../format.js";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons.jsx";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function parse(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function DatePicker({ label, value, onChange, min, error, placeholder = "Pick a date", className = "" }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => firstOfMonth(value ? parse(value) : new Date()));
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  function toggle() {
    if (!open) setMonth(firstOfMonth(value ? parse(value) : new Date()));
    setOpen((o) => !o);
  }

  const y = month.getFullYear();
  const m = month.getMonth();
  const cells = [...Array(month.getDay()).fill(null), ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => new Date(y, m, i + 1))];
  const canGoPrev = !min || ymd(new Date(y, m, 0)) >= min;
  const today = ymd(new Date());

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {label && <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>}
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-white/70 px-3.5 text-left text-[15px] shadow-sm transition hover:border-primary/40 focus:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 ${
          error ? "border-danger" : open ? "border-primary ring-4 ring-primary/10" : "border-line"
        }`}
      >
        <CalendarIcon size={18} className="text-ink/45" />
        <span className={value ? "text-ink" : "text-ink/40"}>{value ? dayFmt.format(parse(value)) : placeholder}</span>
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2.5rem)] animate-pop rounded-xl border border-line bg-white p-3 shadow-lift"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setMonth(new Date(y, m - 1, 1))}
              aria-label="Previous month"
              className="rounded-full p-1.5 text-ink/60 hover:bg-ink/5 disabled:opacity-30"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <span className="text-sm font-medium text-ink">{monthFmt.format(month)}</span>
            <button type="button" onClick={() => setMonth(new Date(y, m + 1, 1))} aria-label="Next month" className="rounded-full p-1.5 text-ink/60 hover:bg-ink/5">
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink/40">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const s = ymd(d);
              const disabled = Boolean(min) && s < min;
              const selected = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-lg text-sm transition disabled:cursor-not-allowed disabled:text-ink/25 ${
                    selected ? "bg-primary font-medium text-paper" : "text-ink hover:bg-primary-light"
                  } ${!selected && s === today ? "ring-1 ring-accent" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
