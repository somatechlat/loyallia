'use client';

import { useState } from 'react';

export interface PlanData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_locations: number;
  max_users: number;
  max_customers: number;
  max_programs: number;
  max_notifications_month: number;
  max_transactions_month: number;
  max_whatsapp_day: number;
  max_emails_month: number;
  max_sms_day: number;
  max_wallet_pushes_month: number;
  max_automations: number;
  max_automation_executions_day: number;
  max_ai_queries_month: number;
  max_api_calls_day: number;
  max_exports_month: number;
  features: string[];
  status: 'draft' | 'published' | 'archived';
  is_active: boolean;
  is_featured: boolean;
  trial_days: number;
  sort_order: number;
}

export const PREDEFINED_FEATURES = [
  { id: 'whatsapp_campaigns', label: 'Campañas de WhatsApp', icon: 'phone' },
  { id: 'sms_campaigns', label: 'Campañas de SMS', icon: 'message' },
  { id: 'email_campaigns', label: 'Campañas de Email', icon: 'mail' },
  { id: 'wallet_campaigns', label: 'Apple/Google Wallet', icon: 'wallet' },
  { id: 'geo_fencing', label: 'Geo-Fencing', icon: 'map' },
  { id: 'automation', label: 'Automatización', icon: 'zap' },
  { id: 'advanced_analytics', label: 'Analítica Avanzada', icon: 'chart' },
  { id: 'ai_assistant', label: 'Asistente IA', icon: 'bot' },
  { id: 'agent_api', label: 'Acceso API Agente', icon: 'plug' },
  { id: 'priority_support', label: 'Soporte Prioritario', icon: 'star' },
  { id: 'custom_branding', label: 'Marca Personalizada', icon: 'palette' },
  { id: 'data_export', label: 'Exportación de Datos', icon: 'upload' },
] as const;

export const emptyPlan: PlanData = {
  id: '',
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_annual: 0,
  max_locations: 1,
  max_users: 3,
  max_customers: 500,
  max_programs: 1,
  max_notifications_month: 1000,
  max_transactions_month: 5000,
  max_whatsapp_day: 0,
  max_emails_month: 0,
  max_sms_day: 0,
  max_wallet_pushes_month: 0,
  max_automations: 0,
  max_automation_executions_day: 0,
  max_ai_queries_month: 0,
  max_api_calls_day: 0,
  max_exports_month: 0,
  features: [],
  status: 'draft',
  is_active: true,
  is_featured: false,
  trial_days: 14,
  sort_order: 0,
};

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-surface-800 dark:text-surface-100 font-medium">{value}</p>
    </div>
  );
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-surface-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function FeatureTagInput({ features, onChange }: { features: string[]; onChange: (f: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    if (input && !features.includes(input)) onChange([...features, input]);
    setInput('');
  };
  const remove = (i: number) => onChange(features.filter((_, j) => j !== i));
  const availableFeatures = PREDEFINED_FEATURES.filter((f) => !features.includes(f.id));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {features.map((f, i) => {
          const preset = PREDEFINED_FEATURES.find((p) => p.id === f);
          const label = preset ? preset.label : f;
          return (
            <span key={i} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-brand-200">
              {label}
              <button type="button" onClick={() => remove(i)} className="text-brand-400 hover:text-red-500 transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
        {features.length === 0 && <span className="text-xs text-surface-300 italic">Sin características adicionales</span>}
      </div>
      <div className="flex gap-2">
        <select
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
        >
          <option value="">Seleccionar característica...</option>
          {availableFeatures.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button type="button" onClick={add} disabled={!input} className="px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-200 text-white disabled:text-surface-400 rounded-xl text-sm font-semibold transition-all">
          Agregar
        </button>
      </div>
    </div>
  );
}
