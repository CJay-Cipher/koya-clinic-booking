import { useEffect, useId, useRef, useState } from "react";
import Spinner from "./Spinner.jsx";
import { ChevronIcon, CheckIcon } from "./Icons.jsx";

export default function Select({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = "Select…",
  icon,
  loading = false,
  disabled = false,
  align = "left",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

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

  useEffect(() => {
    if (open && active >= 0 && listRef.current) {
      const el = listRef.current.children[active];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  function openList() {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(i) {
    const option = options[i];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    if (buttonRef.current) buttonRef.current.focus();
  }

  function onKeyDown(e) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openList();
        else choose(active);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium text-ink/80">
          {label}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={!label ? ariaLabel : undefined}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-white/70 px-3.5 text-left text-[15px] shadow-sm transition hover:border-primary/40 focus:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-primary ring-4 ring-primary/10" : "border-line"
        }`}
      >
        {icon && <span className="text-ink/45">{icon}</span>}
        <span className={`flex-1 truncate ${selected ? "text-ink" : "text-ink/40"}`}>{selected ? selected.label : placeholder}</span>
        {loading ? <Spinner size={16} className="text-primary" /> : <ChevronIcon size={18} className={`text-ink/45 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          className={`absolute z-30 mt-2 max-h-60 w-max min-w-full max-w-[calc(100vw-2.5rem)] animate-pop overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-lift ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o, i) => (
            <li
              key={`${i}-${o.value}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-sm ${
                i === active ? "bg-primary-light text-primary-dark" : "text-ink"
              } ${o.value === value ? "font-medium" : ""}`}
            >
              <span>{o.label}</span>
              {o.value === value && <CheckIcon size={16} className="text-primary" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
