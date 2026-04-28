'use client';
import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────
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

interface ChartContentProps {
  trends: DailyPoint[];
  segments: Segment[];
  programs: Program[];
  days: number;
  isDark: boolean;
  gridColor: string;
  chart: 'revenue' | 'transactions' | 'customers';
  setChart: (c: 'revenue' | 'transactions' | 'customers') => void;
}

export default function ChartContent({ trends, segments, programs, days, isDark, gridColor, chart, setChart }: ChartContentProps) {
  const tooltipStyle = { borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', fontSize: 12, backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#e4e8f0' : '#111827' };

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

  return (
    <>
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
    </>
  );
}
