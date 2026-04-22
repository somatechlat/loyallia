'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ─── Types that MATCH the real API response ─────────────────────────── */
interface OverviewResponse {
  period_days: number;
  customers: { total: number; new: number; growth_rate: number };
  transactions: { total: number; revenue: number; average_value: number };
  programs: { total: number; active: number };
  notifications: { sent: number };
}

interface TrendPoint {
  date: string;
  transactions: number;
  revenue: number;
  new_customers: number;
  rewards_issued: number;
  rewards_redeemed: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#f1f3f7';
  const tickColor = isDark ? '#6b7280' : '#9ca3af';
  const tooltipBg = isDark ? '#1f2937' : '#fff';
  const tooltipText = isDark ? '#e4e8f0' : '#111827';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.08)' : 'transparent';
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([analyticsApi.dashboard(), analyticsApi.trends(30)])
      .then(([dash, trend]) => {
        setOverview(dash.data);
        setTrends(trend.data.daily_data || []);
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        setError('Error de conexión con el servidor');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-surface-200 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        <button className="btn-primary mt-4" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  const stats = [
    {
      label: 'Clientes totales',
      value: overview?.customers?.total?.toLocaleString() ?? '0',
      sub: `+${overview?.customers?.new ?? 0} nuevos`,
      icon: 'users',
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      href: '/customers',
    },
    {
      label: 'Programas activos',
      value: overview?.programs?.active?.toLocaleString() ?? '0',
      sub: `${overview?.programs?.total ?? 0} totales`,
      icon: 'target',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: '/programs',
    },
    {
      label: 'Transacciones (30d)',
      value: overview?.transactions?.total?.toLocaleString() ?? '0',
      sub: `$${(overview?.transactions?.revenue ?? 0).toLocaleString()} ingresos`,
      icon: 'creditcard',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/analytics',
    },
    {
      label: 'Notificaciones enviadas',
      value: overview?.notifications?.sent?.toLocaleString() ?? '0',
      sub: `últimos ${overview?.period_days ?? 30} días`,
      icon: 'bell',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/campaigns',
    },
  ];

  const formatCurrency = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bienvenido, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h1>
          <p className="page-subtitle">Resumen de tu programa de fidelización</p>
        </div>
        <a href="/scanner/scan" target="_blank" className="btn-primary" id="open-scanner-btn">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Abrir Scanner
        </a>
      </div>

      {/* Stats grid — clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon, color, bg, href }) => (
          <a key={label} href={href}
            className="stat-card animate-fade-in cursor-pointer hover:ring-2 hover:ring-brand-200 hover:shadow-lg transition-all duration-200 group"
            id={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center ${color}`}>
                {icon === 'users' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                {icon === 'target' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
                {icon === 'creditcard' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
                {icon === 'bell' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
              </div>
              <div className="flex items-center gap-2">
                {overview?.customers?.growth_rate && label === 'Clientes totales' ? (
                  <span className="badge-green text-xs">↑ {overview.customers.growth_rate.toFixed(1)}%</span>
                ) : null}
                <span className="text-surface-300 group-hover:text-brand-500 transition-colors text-sm">→</span>
              </div>
            </div>
            <div>
              <p className={`stat-value ${color}`}>{value}</p>
              <p className="stat-label">{label}</p>
              <p className="text-xs text-surface-400 mt-1">{sub}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Revenue + Transaction chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-surface-900 mb-4">Transacciones — Últimos 30 días</h2>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5660ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#5660ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }} />
                <Area type="monotone" dataKey="transactions" stroke="#5660ff" strokeWidth={2} fill="url(#brandGrad)" name="Transacciones" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-surface-400 text-sm">
              No hay datos de tendencias aún.
            </div>
          )}
        </div>

        {/* Quick stats sidebar */}
        <div className="card p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-surface-900">Resumen rápido</h2>
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-sm text-surface-500">Ingreso promedio</span>
              <span className="text-sm font-bold text-surface-900">{formatCurrency(overview?.transactions?.average_value ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-sm text-surface-500">Crecimiento clientes</span>
              <span className="text-sm font-bold text-emerald-600">+{overview?.customers?.growth_rate?.toFixed(1) ?? '0'}%</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-sm text-surface-500">Ingresos totales (30d)</span>
              <span className="text-sm font-bold text-surface-900">{formatCurrency(overview?.transactions?.revenue ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-surface-500">Clientes nuevos (30d)</span>
              <span className="text-sm font-bold text-brand-600">{overview?.customers?.new ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      {trends.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-surface-900 mb-4">Ingresos diarios — Últimos 30 días</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }}
                formatter={(v: number) => [`$${v}`, 'Ingresos']} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" name="Ingresos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
