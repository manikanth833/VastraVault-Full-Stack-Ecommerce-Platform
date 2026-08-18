import React, { useEffect } from "react";

export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = "Yes, Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal-950/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        <h2 id="confirmation-modal-title" className="font-serif text-xl font-bold text-charcoal-900">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-semibold text-charcoal-700 transition-colors hover:bg-neutral-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-royal-red-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
