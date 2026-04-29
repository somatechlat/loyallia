'use client';

/**
 * LYL-H-FE-005: Standardized confirmation modal.
 * LYL-M-FE-029: Focus management — trap focus, restore on close.
 * LYL-H-FE-013: Keyboard navigation — Escape to close, Tab trap.
 */

import { useEffect, useRef, useCallback } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    default: 'bg-brand-500 hover:bg-brand-600 text-white',
  };

  // LYL-M-FE-029: Focus management — save and restore focus
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Focus the confirm button on open
    const timer = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  // LYL-H-FE-013: Keyboard navigation — Escape to close, Tab trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-lg font-bold text-surface-900 dark:text-white mb-2">
          {title}
        </h3>
        <p id="confirm-modal-desc" className="text-surface-500 text-sm mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            ref={confirmBtnRef}
            onClick={onCancel}
            className="btn-ghost flex-1 text-sm"
            disabled={loading}
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            aria-label={confirmLabel}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${variantStyles[variant]}`}
          >
            {loading ? (
              <span className="spinner w-4 h-4 inline-block" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
