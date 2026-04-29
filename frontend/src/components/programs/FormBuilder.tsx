/**
 * FormBuilder — Dynamic form field configurator for card enrollment.
 * Stores config in card.metadata.form_fields as a JSON schema.
 * Per SRS ENR-001 to ENR-006.
 */
'use client';
import { useState } from 'react';
import Tooltip from '@/components/ui/Tooltip';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number';
  label: string;
  placeholder: string;
  required: boolean;
  unique: boolean;
  options?: string[];       // For 'select' type
  country_code?: boolean;   // For 'tel' type — show country code selector
}

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPE_LABELS: Record<FormField['type'], string> = {
  text: 'Texto',
  email: 'Correo electrónico',
  tel: 'Teléfono',
  date: 'Fecha',
  select: 'Selección',
  number: 'Número',
};

const DEFAULT_FIELDS: FormField[] = [
  { id: 'name', type: 'text', label: 'Nombre completo', placeholder: 'María García', required: true, unique: false },
  { id: 'email', type: 'email', label: 'Correo electrónico', placeholder: 'cliente@email.com', required: true, unique: true },
  { id: 'phone', type: 'tel', label: 'Teléfono', placeholder: '+593 99 123 4567', required: false, unique: false, country_code: true },
];

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const currentFields = fields.length > 0 ? fields : DEFAULT_FIELDS;

  const addField = () => {
    const newField: FormField = {
      id: generateId(),
      type: 'text',
      label: 'Nuevo campo',
      placeholder: '',
      required: false,
      unique: false,
    };
    onChange([...currentFields, newField]);
    setExpandedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(currentFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    // Prevent removing all fields
    if (currentFields.length <= 1) return;
    onChange(currentFields.filter(f => f.id !== id));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const idx = currentFields.findIndex(f => f.id === id);
    if (idx < 0) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= currentFields.length) return;
    const copy = [...currentFields];
    [copy[idx]!, copy[target]!] = [copy[target]!, copy[idx]!];
    onChange(copy);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">Formulario de inscripción</h3>
          <Tooltip text="Configura los campos que los clientes deberán completar al inscribirse en este programa." />
        </div>
        <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={addField}>
          + Agregar campo
        </button>
      </div>

      <div className="space-y-2">
        {currentFields.map((field, idx) => (
          <div key={field.id} className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
            {/* Row header */}
            <div
              className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800/50 cursor-pointer"
              onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
            >
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button type="button" className="text-[10px] text-surface-400 hover:text-brand-500 disabled:opacity-30"
                  onClick={e => { e.stopPropagation(); moveField(field.id, 'up'); }} disabled={idx === 0}>▲</button>
                <button type="button" className="text-[10px] text-surface-400 hover:text-brand-500 disabled:opacity-30"
                  onClick={e => { e.stopPropagation(); moveField(field.id, 'down'); }} disabled={idx === currentFields.length - 1}>▼</button>
              </div>

              {/* Type badge */}
              <span className="text-[10px] uppercase tracking-wider font-semibold text-surface-500 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded">
                {FIELD_TYPE_LABELS[field.type]}
              </span>

              {/* Label */}
              <span className="text-sm font-medium text-surface-900 dark:text-white flex-1 truncate">{field.label}</span>

              {/* Badges */}
              <div className="flex items-center gap-1.5">
                {field.required && <span className="badge-red text-[9px]">Req</span>}
                {field.unique && <span className="badge-blue text-[9px]">Único</span>}
                {field.type === 'tel' && field.country_code && <span className="badge-green text-[9px]">+Cód</span>}
              </div>

              {/* Delete */}
              <button type="button" className="text-surface-400 hover:text-red-500 transition-colors text-sm"
                onClick={e => { e.stopPropagation(); removeField(field.id); }}
                disabled={currentFields.length <= 1}>✕</button>

              {/* Chevron */}
              <span className={`text-surface-400 text-xs transition-transform ${expandedField === field.id ? 'rotate-180' : ''}`}>▾</span>
            </div>

            {/* Expanded config */}
            {expandedField === field.id && (
              <div className="p-4 space-y-3 border-t border-surface-200 dark:border-surface-700 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Etiqueta</label>
                    <input type="text" className="input text-sm" value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Tipo de campo</label>
                    <select className="input text-sm" value={field.type}
                      onChange={e => updateField(field.id, { type: e.target.value as FormField['type'] })}>
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Placeholder</label>
                  <input type="text" className="input text-sm" value={field.placeholder}
                    onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                      checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Obligatorio</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                      checked={field.unique} onChange={e => updateField(field.id, { unique: e.target.checked })} />
                    <span className="text-sm text-surface-700 dark:text-surface-300">Valor único</span>
                  </label>
                  {field.type === 'tel' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                        checked={!!field.country_code} onChange={e => updateField(field.id, { country_code: e.target.checked })} />
                      <span className="text-sm text-surface-700 dark:text-surface-300">Código de país</span>
                    </label>
                  )}
                </div>
                {field.type === 'select' && (
                  <div>
                    <label className="label">Opciones (una por línea)</label>
                    <textarea className="input text-sm min-h-[60px]" value={(field.options ?? []).join('\n')}
                      onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-surface-400 text-center">
        {currentFields.length} campo{currentFields.length !== 1 ? 's' : ''} configurado{currentFields.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export { DEFAULT_FIELDS };
