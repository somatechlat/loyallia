/**
 * InfoTooltip — Reusable "ℹ" icon that displays a metric explanation on hover.
 * Used on every dashboard module/chart header per DASH-007.
 */
import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  /** The explanation text shown in the popover */
  explanation: string;
  /** Optional label for the metric */
  label?: string;
}

export default function InfoTooltip({ explanation, label }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        className="w-5 h-5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 flex items-center justify-center transition-colors text-[10px] font-bold"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={label ? `Info: ${label}` : 'Información'}
      >
        i
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl text-xs text-surface-600 dark:text-surface-300 leading-relaxed animate-fade-in">
          {label && <p className="font-bold text-surface-900 dark:text-white mb-1">{label}</p>}
          <p>{explanation}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-white dark:bg-surface-800 border-r border-b border-surface-200 dark:border-surface-700 rotate-45" />
        </div>
      )}
    </div>
  );
}
