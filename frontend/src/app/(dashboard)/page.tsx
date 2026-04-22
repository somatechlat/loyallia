'use client';
import { useEffect, useState, useCallback } from 'react';
import { analyticsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

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

type DateRange = 7 | 14 | 30 | 90;
type ChartTab = 'revenue' | 'visits' | 'customers';

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
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [chartTab, setChartTab] = useState<ChartTab>('revenue');

  const fetchData = useCallback(async (days: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const [dash, trend] = await Promise.all([
        analyticsApi.dashboard(),
        analyticsApi.trends(days),
      ]);
      setOverview(dash.data);
      setTrends(trend.data.daily_data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  const handleDateRange = (days: DateRange) => {
    setDateRange(days);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 dark:bg-surface-700 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface-200 dark:bg-surface-700 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-500 font-semibold">{error}</p>
        <button className="btn-primary mt-4" onClick={() => fetchData(dateRange)}>Reintentar</button>
      </div>
    );
  }

  const stats = [
    {
      label: 'Clientes totales',
      value: overview?.customers?.total?.toLocaleString() ?? '0',
      sub: `+${overview?.customers?.new ?? 0} nuevos`,
      icon: 'users',
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-900/30',
      href: '/customers',
      delta: overview?.customers?.growth_rate ?? 0,
    },
    {
      label: 'Programas activos',
      value: overview?.programs?.active?.toLocaleString() ?? '0',
      sub: `${overview?.programs?.total ?? 0} totales`,
      icon: 'target',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      href: '/programs',
      delta: 0,
    },
    {
      label: 'Transacciones',
      value: overview?.transactions?.total?.toLocaleString() ?? '0',
      sub: `$${(overview?.transactions?.revenue ?? 0).toLocaleString()} ingresos`,
      icon: 'creditcard',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      href: '/analytics',
      delta: 0,
    },
    {
      label: 'Notificaciones',
      value: overview?.notifications?.sent?.toLocaleString() ?? '0',
      sub: `últimos ${overview?.period_days ?? 30} días`,
      icon: 'bell',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      href: '/campaigns',
      delta: 0,
    },
  ];

  const formatCurrency = (v: number) => `$${v.toLocaleString()}`;

  const dateRanges: { days: DateRange; label: string }[] = [
    { days: 7, label: '7d' },
    { days: 14, label: '14d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
  ];

  const chartTabs: { key: ChartTab; label: string; icon: string }[] = [
    { key: 'revenue', label: 'Ganancias', icon: '💰' },
    { key: 'visits', label: 'Visitas', icon: '📊' },
    { key: 'customers', label: 'Clientes nuevos', icon: '👥' },
  ];

  const getChartConfig = () => {
    switch (chartTab) {
      case 'revenue':
        return { dataKey: 'revenue', name: 'Ingresos', stroke: '#10b981', grad: 'revenueGrad', formatter: (v: number) => [`$${v}`, 'Ingresos'] };
      case 'visits':
        return { dataKey: 'transactions', name: 'Transacciones', stroke: '#5660ff', grad: 'brandGrad', formatter: (v: number) => [v, 'Transacciones'] };
      case 'customers':
        return { dataKey: 'new_customers', name: 'Clientes nuevos', stroke: '#f59e0b', grad: 'customerGrad', formatter: (v: number) => [v, 'Clientes nuevos'] };
    }
  };

  const chartConfig = getChartConfig();

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bienvenido, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</h1>
          <p className="page-subtitle">Resumen de tu programa de fidelización</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range pills */}
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1" id="date-range-selector">
            {dateRanges.map(({ days, label }) => (
              <button
                key={days}
                onClick={() => handleDateRange(days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  dateRange === days
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
                id={`date-range-${days}`}
              >
                {label}
              </button>
            ))}
          </div>
          <a href="/scanner/scan" target="_blank" className="btn-primary" id="open-scanner-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Scanner
          </a>
        </div>
      </div>

      {/* Stats grid — clickable cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon, color, bg, href, delta }) => (
          <a key={label} href={href}
            className="stat-card animate-fade-in cursor-pointer hover:ring-2 hover:ring-brand-200 dark:hover:ring-brand-700 hover:shadow-lg transition-all duration-200 group"
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
                {delta > 0 && (
                  <span className="badge-green text-xs">↑ {delta.toFixed(1)}%</span>
                )}
                <span className="text-surface-300 dark:text-surface-600 group-hover:text-brand-500 transition-colors text-sm">→</span>
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

      {/* Main chart with tabs */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            Tendencias — Últimos {dateRange} días
          </h2>
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1" id="chart-tabs">
            {chartTabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setChartTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  chartTab === key
                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
                id={`chart-tab-${key}`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
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
                <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false}
                tickFormatter={chartTab === 'revenue' ? (v: number) => `$${v}` : undefined} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }}
                formatter={chartConfig.formatter}
              />
              <Area type="monotone" dataKey={chartConfig.dataKey} stroke={chartConfig.stroke} strokeWidth={2} fill={`url(#${chartConfig.grad})`} name={chartConfig.name} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-surface-400 text-sm">
            No hay datos de tendencias aún.
          </div>
        )}
      </div>

      {/* Bottom grid: Demographics + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Demographics / engagement bar chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Recompensas — Emitidas vs Canjeadas
          </h2>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends.slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false}
                  tickFormatter={d => d.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }} />
                <Bar dataKey="rewards_issued" name="Emitidas" fill="#5660ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rewards_redeemed" name="Canjeadas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-surface-400 text-sm">
              No hay datos de recompensas aún.
            </div>
          )}
        </div>

        {/* Quick stats sidebar */}
        <div className="card p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Resumen rápido</h2>
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between py-3 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">Ticket promedio</span>
              <span className="text-sm font-bold text-surface-900 dark:text-surface-100">{formatCurrency(overview?.transactions?.average_value ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">Crecimiento clientes</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{overview?.customers?.growth_rate?.toFixed(1) ?? '0'}%</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100 dark:border-surface-700">
              <span className="text-sm text-surface-500">Ingresos totales</span>
              <span className="text-sm font-bold text-surface-900 dark:text-surface-100">{formatCurrency(overview?.transactions?.revenue ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-surface-500">Clientes nuevos</span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{overview?.customers?.new ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
