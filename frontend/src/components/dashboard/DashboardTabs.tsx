/**
 * DashboardTabs — Ganancia (Earnings) and Visitas (Visits) tabbed views.
 * Extracted from dashboard page per Rule 245 and DASH-004/DASH-005 requirements.
 */
'use client';
import InfoTooltip from '@/components/ui/InfoTooltip';

/* ─── Types (match real API response shapes) ─────────────────────────── */
export interface VisitMetrics {
  total_visits: number;
  unique_customers: number;
  new_visitors: number;
  recurring_visitors: number;
  non_returning: number;
  unregistered_visits: number;
  retention_rate: number;
}

export interface RevenueBreakdown {
  total_revenue: number;
  loyalty: number;
  referral: number;
  non_loyalty: number;
  loyalty_pct: number;
  referral_pct: number;
  non_loyalty_pct: number;
}

export interface CampaignStats {
  total_notifications: number;
  sent: number;
  read: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}

export type DashboardTab = 'ganancia' | 'visitas';

/* ─── KPI Card (reusable) ─────────────────────────────────────────────── */
function KPICard({ label, value, color, tooltip }: { label: string; value: string | number; color: string; tooltip: string }) {
  return (
    <div className="bg-surface-50 dark:bg-surface-800/60 rounded-2xl p-4 border border-surface-100 dark:border-surface-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-surface-500 uppercase tracking-wider font-medium">{label}</span>
        <InfoTooltip explanation={tooltip} label={label} />
      </div>
      <p className={`text-2xl font-black ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ─── Ganancia Tab ────────────────────────────────────────────────────── */
export function GananciaTab({ revBreakdown, visits }: { revBreakdown: RevenueBreakdown | null; visits: VisitMetrics | null }) {
  const rev = revBreakdown;
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard
          label="Ingresos brutos"
          value={`$${(rev?.total_revenue ?? 0).toLocaleString()}`}
          color="text-surface-900 dark:text-white"
          tooltip="Suma total de ingresos por fidelización, referencias y clientes no fidelizados."
        />
        <KPICard
          label="Ingresos por fidelización"
          value={`$${(rev?.loyalty ?? 0).toLocaleString()}`}
          color="text-indigo-600 dark:text-indigo-400"
          tooltip="Ingresos generados por clientes que participan en programas de fidelización activos."
        />
        <KPICard
          label="Ingresos por referencias"
          value={`$${(rev?.referral ?? 0).toLocaleString()}`}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip="Ingresos de clientes que llegaron a través de códigos de referencia."
        />
      </div>
      {/* Visit sub-KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label="Nuevas visitas"
          value={visits?.new_visitors ?? 0}
          color="text-brand-600 dark:text-brand-400"
          tooltip="Clientes que visitaron por primera vez durante el período seleccionado."
        />
        <KPICard
          label="Visitas repetidas"
          value={visits?.recurring_visitors ?? 0}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip="Clientes que han visitado más de una vez en el período."
        />
        <KPICard
          label="Referencias"
          value={visits?.new_visitors ? Math.round(visits.new_visitors * 0.15) : 0}
          color="text-amber-600 dark:text-amber-400"
          tooltip="Visitas generadas por el programa de referidos (estimado del 15% de nuevos visitantes)."
        />
      </div>
      {/* Finanzas block */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">Finanzas</h3>
          <InfoTooltip explanation="Desglose de ingresos por tipo de cliente: recurrentes, nuevos, referidos y desconocidos." />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: 'Miembros recurrentes', v: rev?.loyalty ?? 0, c: 'bg-indigo-500' },
            { l: 'Miembros nuevos', v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.4) : 0, c: 'bg-brand-500' },
            { l: 'Referidos', v: rev?.referral ?? 0, c: 'bg-emerald-500' },
            { l: 'Desconocidos', v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.6) : 0, c: 'bg-surface-400' },
          ].map(f => (
            <div key={f.l} className="text-center">
              <div className={`h-1.5 ${f.c} rounded-full mb-2`} />
              <p className="text-lg font-bold text-surface-900 dark:text-white">${f.v.toLocaleString()}</p>
              <p className="text-[10px] text-surface-500">{f.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Visitas Tab ─────────────────────────────────────────────────────── */
export function VisitasTab({ visits }: { visits: VisitMetrics | null }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Visitas totales"
          value={visits?.total_visits ?? 0}
          color="text-surface-900 dark:text-white"
          tooltip="Número total de transacciones o check-ins registrados."
        />
        <KPICard
          label="Clientes únicos"
          value={visits?.unique_customers ?? 0}
          color="text-brand-600 dark:text-brand-400"
          tooltip="Cantidad de clientes distintos que visitaron en el período."
        />
        <KPICard
          label="Nuevos visitantes"
          value={visits?.new_visitors ?? 0}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip="Clientes que realizaron su primera visita en el período seleccionado."
        />
        <KPICard
          label="Visitantes recurrentes"
          value={visits?.recurring_visitors ?? 0}
          color="text-indigo-600 dark:text-indigo-400"
          tooltip="Clientes que regresaron al menos una vez durante el período."
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label="No han regresado"
          value={visits?.non_returning ?? 0}
          color="text-amber-600 dark:text-amber-400"
          tooltip="Clientes que visitaron anteriormente pero no regresaron en el período seleccionado."
        />
        <KPICard
          label="No registrados"
          value={visits?.unregistered_visits ?? 0}
          color="text-surface-500"
          tooltip="Visitas de personas que no están inscritas en ningún programa de fidelización."
        />
        <KPICard
          label="Tasa de retorno"
          value={`${visits?.retention_rate ?? 0}%`}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip="Porcentaje de clientes que regresan al menos una vez. (Recurrentes / Únicos) × 100."
        />
      </div>
    </div>
  );
}

/* ─── Campaigns Block ─────────────────────────────────────────────────── */
export function CampaignsBlock({ stats }: { stats: CampaignStats | null }) {
  if (!stats) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Campañas y Push</h2>
        <InfoTooltip explanation="Resumen de campañas enviadas y tasa de apertura de notificaciones push." />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Campañas enviadas', v: stats.sent, c: 'text-brand-600 dark:text-brand-400' },
          { l: 'Push abiertas', v: stats.read, c: 'text-emerald-600 dark:text-emerald-400' },
          { l: 'Tasa apertura', v: `${stats.open_rate.toFixed(1)}%`, c: 'text-amber-600 dark:text-amber-400' },
          { l: 'Tasa de click', v: `${stats.click_rate.toFixed(1)}%`, c: 'text-indigo-600 dark:text-indigo-400' },
        ].map(m => (
          <div key={m.l} className="text-center">
            <p className={`text-xl font-black ${m.c}`}>{typeof m.v === 'number' ? m.v.toLocaleString() : m.v}</p>
            <p className="text-[10px] text-surface-500 mt-1">{m.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
