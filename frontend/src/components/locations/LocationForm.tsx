'use client';

/**
 * LocationForm — Create/edit form for a location.
 *
 * Extracted from locations/page.tsx as part of LYL-C-FE-002 (mega-component decomposition).
 *
 * @param form - Current form state
 * @param onChange - Callback to update form fields
 * @param onSave - Callback when save is triggered
 * @param onCancel - Callback when cancel is triggered
 * @param saving - Whether save is in progress
 * @param isCreate - Whether this is a create (vs edit) form
 */
import { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import type { LocationFormData } from './types';

/**
 * Props for the LocationForm component.
 */
interface LocationFormProps {
  /** Current form state */
  form: LocationFormData;
  /** State updater for form fields */
  onChange: (updater: (prev: LocationFormData) => LocationFormData) => void;
  /** Save handler */
  onSave: () => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Whether the form is saving */
  saving: boolean;
  /** Whether this is a create (vs edit) form */
  isCreate: boolean;
}

/**
 * @description Internal reusable form field for the location form.
 * @param {Object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.value - Field value
 * @param {(v: string) => void} props.onChange - Change handler
 * @param {string} [props.placeholder] - Input placeholder
 * @returns JSX.Element
 */
function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 block">{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-600 bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
      />
    </div>
  );
}

/**
 * @description Form for creating or editing a location.
 * @param {LocationFormProps} props - Component props
 * @returns JSX.Element
 */
export default function LocationForm({ form, onChange, onSave, onCancel, saving, isCreate }: LocationFormProps) {
  const { t } = useI18n();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus first field on mount (LYL-M-FE-029: focus management)
  useEffect(() => {
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="px-6 pb-6 space-y-3">
      <div>
        <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 block">{t('locations.form.nameLabel')}</label>
        <input
          ref={firstFieldRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={form.name}
          onChange={e => onChange(f => ({ ...f, name: e.target.value }))}
          placeholder="Ej: Mall del Sol"
          className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-600 bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-200 placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
        />
      </div>
      <FormField label={t('locations.form.addressLabel')} value={form.address} onChange={v => onChange(f => ({ ...f, address: v }))} placeholder="Av. 9 de Octubre 424" />
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ciudad" value={form.city} onChange={v => onChange(f => ({ ...f, city: v }))} placeholder="Guayaquil" />
        <FormField label={t('locations.form.phoneLabel')} value={form.phone} onChange={v => onChange(f => ({ ...f, phone: v }))} placeholder="+593 4 268 3200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Latitud" value={form.latitude?.toString() || ''} onChange={v => {
          const num = v ? parseFloat(v) : null;
          if (num !== null && (Number.isNaN(num) || num < -90 || num > 90)) {
            toast.error('La latitud debe estar entre -90 y 90');
            return;
          }
          onChange(f => ({ ...f, latitude: num }));
        }} placeholder="-2.1543" />
        <FormField label="Longitud" value={form.longitude?.toString() || ''} onChange={v => {
          const num = v ? parseFloat(v) : null;
          if (num !== null && (Number.isNaN(num) || num < -180 || num > 180)) {
            toast.error('La longitud debe estar entre -180 y 180');
            return;
          }
          onChange(f => ({ ...f, longitude: num }));
        }} placeholder="-79.8963" />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_primary}
            onChange={e => onChange(f => ({ ...f, is_primary: e.target.checked }))}
            className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-500 focus:ring-brand-400" />
          <span className="text-sm text-surface-700 dark:text-surface-300 font-medium">Sede principal</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active}
            onChange={e => onChange(f => ({ ...f, is_active: e.target.checked }))}
            className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-green-500 focus:ring-green-400" />
          <span className="text-sm text-surface-700 dark:text-surface-300 font-medium">Activa</span>
        </label>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-3">
        <button onClick={onSave} disabled={saving || !form.name.trim()}
          className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 dark:disabled:bg-surface-600 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 dark:shadow-none">
          {saving ? t('common.saving') : isCreate ? t('common.create') : t('common.save')}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600 transition-all">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
