'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { analyticsApi } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import toast from 'react-hot-toast';

// BUG-003/004 fix: removed @ts-nocheck and `as any` casts
// Dynamic import with proper default export wrapping to avoid SSR hydration mismatch
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => ({ default: m.Legend })), { ssr: false });

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

// ── Palette ────────────────────────────────────────────────────────────────
const SEG_COLORS: Record<string, string> = {
  inactive: '#94a3b8', at_risk: '#f59e0b', high_value: '#6366f1',
  regular: '#10b981', new: '#06b6d4',
};
const SEG_LABELS: Record<string, string> = {
  inactive: 'Inactivos', at_risk: 'En riesgo', high_value: 'Alto valor',
  regular: 'Regulares', new: 'Nuevos',
};
const CARD_TYPE_LABELS: Record<string, string> = {
  stamp: 'Sellos', points: 'Puntos', visits: 'Visitas', cashback: 'Cashback',
};

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
  const tooltipStyle = { borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', fontSize: 12, backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#e4e8f0' : '#111827' };

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

  const pieData = useMemo(
    () => segments.map(s => ({
      name: SEG_LABELS[s.segment] ?? s.segment,
      value: s.count,
      color: SEG_COLORS[s.segment] ?? '#6b7280',
      pct: s.percentage,
    })),
    [segments]
  );

  const topPrograms = useMemo(
    () => [...programs].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5),
    [programs]
  );

  const chartKey = chart === 'revenue' ? 'revenue' :
    chart === 'transactions' ? 'transactions' : 'new_customers';
  const chartLabel = chart === 'revenue' ? 'Ingresos ($)' :
    chart === 'transactions' ? 'Transacciones' : 'Nuevos clientes';
  const chartColor = chart === 'revenue' ? '#6366f1' :
    chart === 'transactions' ? '#10b981' : '#06b6d4';

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

      {/* Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold">Tendencia {days} días</h2>
            <div className="flex gap-1 bg-surface-100 rounded-lg p-1 text-xs">
              {(['revenue', 'transactions', 'customers'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setChart(k)}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${chart === k ? 'bg-white shadow text-indigo-600' : 'text-surface-500 hover:text-surface-700'}`}
                >
                  {k === 'revenue' ? 'Ingresos' : k === 'transactions' ? 'Transacciones' : 'Clientes'}
                </button>
              ))}
            </div>
          </div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trends} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }}
                  tickFormatter={d => d.slice(5)}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [chart === 'revenue' ? `$${v.toFixed(2)}` : v, chartLabel]}
                />
                <Bar dataKey={chartKey} fill={chartColor} radius={[6, 6, 0, 0]} name={chartLabel} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-surface-400 text-sm">Sin datos en este período</div>
          )}
        </div>

        {/* Pie Segmentation */}
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Segmentación</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={72}
                    innerRadius={44}
                    strokeWidth={2}
                    stroke={isDark ? '#1f2937' : '#fff'}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name: string) => [`${v.toLocaleString()} clientes`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-1.5">
                {pieData.map((seg, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-surface-600">{seg.name}</span>
                    </span>
                    <span className="font-semibold text-surface-700">{seg.value.toLocaleString()} <span className="text-surface-400 font-normal">({seg.pct.toFixed(0)}%)</span></span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="h-60 flex items-center justify-center text-surface-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Activity Line (rewards) */}
      {trends.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Actividad de recompensas</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trends} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="rewards_issued" stroke="#6366f1" dot={false} strokeWidth={2} name="Emitidas" />
              <Line type="monotone" dataKey="rewards_redeemed" stroke="#10b981" dot={false} strokeWidth={2} name="Canjeadas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Program Performance Table */}
      {topPrograms.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">Rendimiento por programa</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Tipo</th>
                  <th>Inscritos</th>
                  <th>Transacciones</th>
                  <th>Ingresos</th>
                  <th>Tasa de canje</th>
                  <th>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {topPrograms.map((p) => {
                  const maxRev = topPrograms[0]?.total_revenue || 1;
                  const barW = Math.round((p.total_revenue / maxRev) * 100);
                  return (
                    <tr key={p.program_id}>
                      <td className="font-medium max-w-[200px] truncate">{p.program_name}</td>
                      <td><span className="badge-purple">{CARD_TYPE_LABELS[p.card_type] || p.card_type}</span></td>
                      <td>{p.total_enrollments.toLocaleString()}</td>
                      <td>{p.total_transactions.toLocaleString()}</td>
                      <td className="font-semibold">${p.total_revenue.toFixed(2)}</td>
                      <td>
                        <span className={p.redemption_rate > 50 ? 'text-emerald-600' : p.redemption_rate > 20 ? 'text-amber-600' : 'text-surface-500'}>
                          {p.redemption_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="w-28">
                        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
