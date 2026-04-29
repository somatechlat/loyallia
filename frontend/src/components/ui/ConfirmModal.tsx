'use client';

import { useEffect } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    default: 'bg-brand-500 hover:bg-brand-600 text-white',
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">{title}</h3>
        <p className="text-surface-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm" aria-label="Cancelar">
            Cancelar
          </button>
          <button onClick={onConfirm} aria-label={confirmLabel} className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${variantStyles[variant]}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
