import React, { useEffect, useState } from "react";
import "./Toast.css";

const subscribers = new Set();
let nextId = 1;

export function notify(message, options = {}) {
  const toast = {
    id: nextId++,
    message: String(message ?? ""),
    variant: options.variant || "info",
    duration: options.duration ?? 4500,
  };
  subscribers.forEach((fn) => fn(toast));
  return toast.id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAdd = (toast) => {
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };
    subscribers.add(handleAdd);
    return () => {
      subscribers.delete(handleAdd);
    };
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;
  return (
    <div className="mb-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`mb-toast mb-toast--${t.variant}`}>
          <div className="mb-toast__msg">{t.message}</div>
          <button
            type="button"
            className="mb-toast__close"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
