export default function Spinner({ size = 16, className = "" }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-8 text-sm text-ink/60">
      <Spinner size={22} className="text-primary" />
      <span>{label}</span>
    </div>
  );
}
