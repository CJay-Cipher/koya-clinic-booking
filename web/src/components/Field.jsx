import { useId } from "react";

export default function Field({ label, error, hint, icon, className = "", ...props }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink/80">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40">{icon}</span>}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full rounded-xl border bg-white/70 pr-4 text-[15px] text-ink shadow-sm transition placeholder:text-ink/35 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 ${
            icon ? "pl-10" : "pl-4"
          } ${error ? "border-danger" : "border-line"}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}
