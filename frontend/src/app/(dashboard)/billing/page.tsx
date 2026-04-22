'use client';
import { useState, useEffect } from 'react';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Tooltip from '@/components/ui/Tooltip';

interface Subscription { plan: string; status: string; days_until_trial_end?: number; }
interface UsageItem { used: number; limit: number; percentage: number; }
interface Usage { limits: Record<string, UsageItem>; status: string; }

const PLAN_LABELS: Record<string, string> = {
  trial: 'Prueba Gratuita', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise',
};

const PLAN_ICONS: Record<string, string> = {
  trial: '🎁', starter: '🚀', professional: '⚡', enterprise: '🏢',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Activo' },
  trialing:  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'En prueba' },
  past_due:  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Pago pendiente' },
  canceled:  { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Cancelado' },
};

const USAGE_LABELS: Record<string, { label: string; icon: string }> = {
  programs:      { label: 'Programas', icon: '📋' },
  enrollments:   { label: 'Inscripciones', icon: '👤' },
  notifications: { label: 'Notificaciones', icon: '🔔' },
  team_members:  { label: 'Miembros del equipo', icon: '👥' },
  transactions:  { label: 'Transacciones', icon: '💳' },
  campaigns:     { label: 'Campañas', icon: '📣' },
  api_calls:     { label: 'Llamadas API', icon: '🔗' },
};

/** SVG arc for radial gauge */
function RadialGauge({ percentage, color, size = 72 }: { percentage: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="6"
        className="stroke-surface-100 dark:stroke-surface-800" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="6"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className={`transition-all duration-1000 ease-out ${color}`} />
    </svg>
  );
}

function getGaugeColor(pct: number): string {
  if (pct >= 90) return 'stroke-red-500';
  if (pct >= 75) return 'stroke-amber-400';
  return 'stroke-brand-500';
}

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([billingApi.subscription(), billingApi.usage()])
      .then(([s, u]) => { setSub(s.data); setUsage(u.data); })
      .catch(() => toast.error('Error al cargar facturación'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header"><h1 className="page-title">Facturación</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-surface-200 dark:bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_COLORS[sub?.status ?? ''] ?? STATUS_COLORS.active;
  const planIcon = PLAN_ICONS[sub?.plan ?? ''] ?? '📦';
  const planLabel = PLAN_LABELS[sub?.plan ?? ''] ?? sub?.plan ?? 'Plan';

  return (
    <div className="space-y-6" id="billing-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="text-surface-500 text-sm mt-1">Gestiona tu suscripción, revisa tu consumo y administra tus pagos.</p>
        </div>
      </div>

      {/* ── Plan Overview Card ─────────────────────────────────── */}
      <div className="card overflow-visible">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-800 px-6 py-5 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{planIcon}</span>
              <div className="text-white">
                <h2 className="text-xl font-bold">{planLabel}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
            {sub?.days_until_trial_end !== undefined && sub.days_until_trial_end > 0 && (
              <div className="text-right bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
                <p className="text-3xl font-black text-white">{sub.days_until_trial_end}</p>
                <p className="text-xs text-white/70">días restantes de prueba</p>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-surface-600 dark:text-surface-400">
            <p>
              {sub?.plan === 'trial'
                ? 'Explora todas las funciones durante tu período de prueba. Actualiza para desbloquear capacidades ilimitadas.'
                : 'Gestiona tu plan actual y sus características. Puedes cambiar de plan en cualquier momento.'}
            </p>
          </div>
          <button className="btn-primary whitespace-nowrap" id="upgrade-btn">
            {sub?.plan === 'trial' ? '🚀 Mejorar plan' : '⬆️ Cambiar plan'}
          </button>
        </div>
      </div>

      {/* ── Usage Gauges Grid ─────────────────────────────────── */}
      {usage && Object.keys(usage.limits).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-surface-900 dark:text-white">Consumo del plan</h2>
            <Tooltip text="Monitorea el uso de los recursos incluidos en tu plan actual. Al llegar al 90%, recibirás una alerta." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(usage.limits).map(([key, val]) => {
              const meta = USAGE_LABELS[key] ?? { label: key, icon: '📊' };
              const gaugeColor = getGaugeColor(val.percentage);
              return (
                <div key={key} className="card p-5 flex flex-col items-center gap-3 group hover:shadow-card-hover transition-all duration-300"
                  id={`usage-${key}`}>
                  {/* Radial Gauge */}
                  <div className="relative">
                    <RadialGauge percentage={val.percentage} color={gaugeColor} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-surface-900 dark:text-white">{Math.round(val.percentage)}%</span>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">{meta.icon} {meta.label}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      <span className="font-mono font-bold">{val.used.toLocaleString()}</span>
                      <span className="mx-1">/</span>
                      <span className="font-mono">{val.limit.toLocaleString()}</span>
                    </p>
                    {val.percentage >= 90 && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1 animate-pulse">⚠️ Cerca del límite</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Plan Comparison ─────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-surface-900 dark:text-white mb-4">Comparar planes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700">
                <th className="text-left py-3 px-4 font-semibold text-surface-500">Característica</th>
                <th className="text-center py-3 px-4 font-semibold text-surface-500">Starter</th>
                <th className="text-center py-3 px-4 font-semibold text-brand-600">Professional</th>
                <th className="text-center py-3 px-4 font-semibold text-surface-500">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {[
                { feat: 'Programas', starter: '3', pro: '10', ent: 'Ilimitado' },
                { feat: 'Inscripciones', starter: '500', pro: '5,000', ent: 'Ilimitado' },
                { feat: 'Notificaciones push/mes', starter: '1,000', pro: '25,000', ent: 'Ilimitado' },
                { feat: 'Miembros del equipo', starter: '2', pro: '10', ent: 'Ilimitado' },
                { feat: 'Campañas/mes', starter: '5', pro: '50', ent: 'Ilimitado' },
                { feat: 'Soporte prioritario', starter: '—', pro: '✓', ent: '✓' },
                { feat: 'API acceso completo', starter: '—', pro: '✓', ent: '✓' },
                { feat: 'White-label', starter: '—', pro: '—', ent: '✓' },
              ].map(row => (
                <tr key={row.feat} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4 text-surface-700 dark:text-surface-300 font-medium">{row.feat}</td>
                  <td className="py-3 px-4 text-center text-surface-600 dark:text-surface-400">{row.starter}</td>
                  <td className="py-3 px-4 text-center font-semibold text-brand-600 dark:text-brand-400">{row.pro}</td>
                  <td className="py-3 px-4 text-center text-surface-600 dark:text-surface-400">{row.ent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment History ─────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white">Historial de pagos</h2>
          <Tooltip text="Aquí se mostrarán los pagos realizados cuando actives un plan de pago." />
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 14l6-6M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6c0-1.1.9-2 2-2zM9 9h.01M15 15h.01"/>
            </svg>
          </div>
          <p className="text-surface-500 text-sm">No hay pagos registrados aún</p>
          <p className="text-surface-400 text-xs mt-1">Los recibos aparecerán aquí cuando realices tu primer pago</p>
        </div>
      </div>
    </div>
  );
}
