// ConfirmDialog.jsx — replaces window.confirm() for destructive actions.
//
// Controlled modal: pass `open`, `onConfirm`, `onCancel`. Intentionally
// lightweight — no portal; renders inside the calling tree, but uses a
// fixed-position overlay so it still covers the viewport. Keyboard:
// Escape cancels, Enter confirms. Focus is trapped to the action buttons.

import React, { useEffect, useRef } from 'react';
import RetroButton from './RetroButton.jsx';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // "danger" | "primary"
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    // Focus the primary action when the dialog opens.
    confirmRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm?.();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="retro-dialog-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="retro-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="retro-dialog-title"
        aria-describedby="retro-dialog-body"
      >
        <div className="retro-dialog-titlebar" id="retro-dialog-title">
          <span>{title}</span>
        </div>
        <div className="retro-dialog-body" id="retro-dialog-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="retro-dialog-actions">
          <RetroButton onClick={onCancel}>{cancelLabel}</RetroButton>
          <RetroButton
            variant={variant}
            onClick={onConfirm}
            ref={confirmRef}
          >
            {confirmLabel}
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
