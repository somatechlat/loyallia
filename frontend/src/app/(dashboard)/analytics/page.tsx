'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { analyticsApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import toast from 'react-hot-toast';

// BUG-003/004 fix: removed @ts-nocheck and `as any` casts
// PERF-003: Single dynamic import wrapper for all recharts (was 13 separate chunks)
const ChartContent = dynamic(
  () => import('./ChartContent').then(m => ({ default: m.default })),
  { ssr: false, loading: () => <div className="h-60 flex items-center justify-center text-surface-400 text-sm animate-pulse">Cargando gráficos...</div> }
);

// ── Types ──────────────────────────────────────────────────────────────────
interface Overview {
  customers: { total: number; new: number; growth_rate: number };
  transactions: { total: number; revenue: number; average_value: number };
  programs: { total: number; active: number };
  notifications: { sent: number };
}

interface DailyPoint {
  date: string;
  new_customers: number;
  transactions: number;
  revenue: number;
  rewards_issued: number;
  rewards_redeemed: number;
}

interface Segment {
  segment: string;
  count: number;
  percentage: number;
  total_spent: number;
  avg_spent: number;
}

interface Program {
  program_id: string;
  program_name: string;
  card_type: string;
  total_enrollments: number;
  total_transactions: number;
  total_revenue: number;
  redemption_rate: number;
}

// ── KPI Card ───────────────────────────────────────────────────────────────
const KPI_ICONS: Record<string, JSX.Element> = {
  revenue: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><path d="M12 18V6"/></svg>,
  customers: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  transactions: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  notifications: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: string; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color} text-surface-600`}>
        {KPI_ICONS[icon] || KPI_ICONS['revenue']}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-surface-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
        <p className="text-xs text-surface-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<DailyPoint[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState<'revenue' | 'transactions' | 'customers'>('revenue');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#f1f3f7';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.dashboard(),
      analyticsApi.trends(days),
      analyticsApi.segments(),
      analyticsApi.programs(),
    ])
      .then(([ov, tr, sg, pg]) => {
        setOverview(ov.data);
        setTrends(tr.data.daily_data || []);
        setSegments(sg.data.segments || []);
        setPrograms(pg.data.programs || []);
      })
      .catch((err) => {
        console.error('Analytics error:', err);
        toast.error('Error al cargar analytics');
      })
      .finally(() => setLoading(false));
  }, [days]);

  const fmt = (n: number, prefix = '') =>
    `${prefix}${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toLocaleString('es-EC')}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Analíticas</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-surface-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-surface-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="page-title">Analíticas</h1>
          <p className="text-surface-500 text-sm mt-1">Métricas de rendimiento del negocio</p>
        </div>
        <select
          id="days-selector"
          className="input w-auto"
          value={days}
          onChange={e => setDays(Number(e.target.value))}
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos totales"
          value={`$${fmt(overview?.transactions.revenue ?? 0)}`}
          sub={`${days} días · prom. $${(overview?.transactions.average_value ?? 0).toFixed(2)}/tx`}
          icon="revenue"
          color="bg-indigo-50"
        />
        <KpiCard
          label="Clientes totales"
          value={fmt(overview?.customers.total ?? 0)}
          sub={`+${fmt(overview?.customers.new ?? 0)} nuevos · ${(overview?.customers.growth_rate ?? 0).toFixed(1)}% crecimiento`}
          icon="customers"
          color="bg-emerald-50"
        />
        <KpiCard
          label="Transacciones"
          value={fmt(overview?.transactions.total ?? 0)}
          sub={`En los últimos ${days} días`}
          icon="transactions"
          color="bg-cyan-50"
        />
        <KpiCard
          label="Notificaciones"
          value={fmt(overview?.notifications.sent ?? 0)}
          sub={`${overview?.programs.active ?? 0} programas activos`}
          icon="notifications"
          color="bg-amber-50"
        />
      </div>

      {/* Charts — dynamically loaded as single chunk (PERF-003) */}
      <ChartContent
        trends={trends}
        segments={segments}
        programs={programs}
        days={days}
        isDark={isDark}
        gridColor={gridColor}
        chart={chart}
        setChart={setChart}
      />
    </div>
  );
}
