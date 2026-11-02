import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.jsx";
import { TrashIcon, AlertIcon } from "./Icons.jsx";

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  loadingLabel,
  cancelLabel = "Cancel",
  loading = false,
  error,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const id = useId();

  // Lock page scroll, move focus into the dialog, and restore both on close.
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current && dialogRef.current.querySelector("[data-autofocus]");
    if (first) first.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [open]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll("button:not([disabled])");
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!loading) onCancel();
        }}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="relative w-full max-w-md animate-pop rounded-2xl border border-line bg-white p-6 shadow-lift"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
          <TrashIcon size={20} />
        </span>
        <h3 id={`${id}-title`} className="font-serif text-xl text-ink">
          {title}
        </h3>
        <div id={`${id}-body`} className="mt-2 text-sm text-ink/65">
          {children}
        </div>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={loading} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant="solidDanger" onClick={onConfirm} loading={loading} loadingText={loadingLabel}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
