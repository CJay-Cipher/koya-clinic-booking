import { AlertIcon } from "./Icons.jsx";

export default function EmptyState({ icon, title, children, action, tone = "default" }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/50 px-6 py-12 text-center">
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          tone === "danger" ? "bg-danger/10 text-danger" : "bg-primary-light text-primary"
        }`}
      >
        {icon}
      </div>
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink/60">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({ children, tone = "danger", onClose }) {
  const styles = tone === "warn" ? "border-accent/30 bg-accent/10 text-accent-dark" : "border-danger/25 bg-danger/5 text-danger";
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <AlertIcon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-xs font-medium underline underline-offset-2">
          Dismiss
        </button>
      )}
    </div>
  );
}
