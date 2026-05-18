'use client';
import { useEffect, useState, useCallback } from 'react';
import { analyticsApi, notificationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { GananciaTab, VisitasTab, type DashboardTab, type CampaignStats } from '@/components/dashboard/DashboardTabs';
import DashboardInsights from '@/components/dashboard/DashboardInsights';

/* ─── Types that MATCH the real API response ─────────────────────────── */
interface OverviewResponse {
  period_days: number;
  customers: { total: number; new: number; growth_rate: number };
  transactions: { total: number; revenue: number; average_value: number };
  programs: { total: number; active: number };
  notifications: { sent: number };
}

interface TrendPoint { [key: string]: string | number;
  date: string;
  transactions: number;
  revenue: number;
  new_customers: number;
  rewards_issued: number;
  rewards_redeemed: number;
}

interface VisitMetrics { total_visits: number; unique_customers: number; new_visitors: number; recurring_visitors: number; non_returning: number; unregistered_visits: number; retention_rate: number; }
interface TopBuyer { customer_id: string; name: string; email: string; total_spent: number; visits: number; }
interface DemoGender { gender: string; count: number; percentage: number; }
interface DemoAge { range: string; count: number; percentage: number; }
interface RevenueBreakdown { total_revenue: number; loyalty: number; referral: number; non_loyalty: number; loyalty_pct: number; referral_pct: number; non_loyalty_pct: number; }
interface ProgramType { type: string; label: string; visits: number; revenue: number; unique_customers: number; }
type DateRange = 1 | 7 | 28 | 30 | 180 | 365 | 'mtd' | 'custom';
type ChartTab = 'revenue' | 'visits' | 'customers';

/** Resolve DateRange to actual number of days for API calls. */
function resolveDays(range: DateRange): number {
  if (typeof range === 'number') return range;
  if (range === 'mtd') {
    const now = new Date();
    return now.getDate(); // Days since start of month
  }
  return 30; // fallback for 'custom'
}

/** Static SVG gradient definitions — extracted to avoid recreation every render */
const CHART_GRADIENTS = (
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
);

/* ─── Shared Stat Card Icons (QUAL-003: deduplicated from inline SVGs) ── */
function IconUsers({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconTarget({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IconCreditCard({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IconBell({ className = 'w-5 h-5' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
const STAT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  users: IconUsers, target: IconTarget, creditcard: IconCreditCard, bell: IconBell,
};

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
  const [visits, setVisits] = useState<VisitMetrics | null>(null);
  const [topBuyers, setTopBuyers] = useState<TopBuyer[]>([]);
  const [genders, setGenders] = useState<DemoGender[]>([]);
  const [ages, setAges] = useState<DemoAge[]>([]);
  const [revBreakdown, setRevBreakdown] = useState<RevenueBreakdown | null>(null);
  const [programTypes, setProgramTypes] = useState<ProgramType[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [dashTab, setDashTab] = useState<DashboardTab>('ganancia');
  const [chartTab, setChartTab] = useState<ChartTab>('revenue');
  const [notifying, setNotifying] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const fetchData = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError(null);
    const days = resolveDays(range);
    try {
      const [dash, trend, vis, tb, demo, rb, pt, ns] = await Promise.all([
        analyticsApi.dashboard(days),
        analyticsApi.trends(days),
        analyticsApi.visits(days),
        analyticsApi.topBuyers(15, days),
        analyticsApi.demographics(),
        analyticsApi.revenueBreakdown(days),
        analyticsApi.byProgramType(days),
        notificationsApi.stats().catch(() => ({ data: null })),
      ]);
      setOverview(dash.data);
      setTrends(trend.data.daily_data || []);
      setVisits(vis.data);
      setTopBuyers(tb.data.buyers || []);
      setGenders(demo.data.gender || []);
      setAges(demo.data.age_ranges || []);
      setRevBreakdown(rb.data);
      setProgramTypes(pt.data.program_types || []);
      setCampaignStats(ns.data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  // PERF-001: Debounce date range changes to avoid rapid API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(dateRange);
    }, 200);
    return () => clearTimeout(timer);
  }, [dateRange, fetchData]);

  const handleDateRange = (range: DateRange) => {
    if (range === 'custom') {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    setDateRange(range);
  };

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    setDateRange(diffDays as DateRange);
    setShowCustomPicker(false);
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


  const dateRanges: { days: DateRange; label: string }[] = [
    { days: 1, label: 'Hoy' },
    { days: 7, label: '7 días' },
    { days: 28, label: '4 sem' },
    { days: 180, label: '6 meses' },
    { days: 365, label: '12 meses' },
    { days: 'mtd', label: 'MTD' },
    { days: 'custom', label: 'Periodo' },
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range pills */}
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-0.5 flex-wrap" id="date-range-selector" role="radiogroup" aria-label="Período de tiempo">
            {dateRanges.map(({ days, label }) => (
              <button
                key={String(days)}
                onClick={() => handleDateRange(days)}
                role="radio"
                aria-checked={dateRange === days}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
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

      {/* Custom date picker */}
      {showCustomPicker && (
        <div className="card p-4 flex items-center gap-3 animate-fade-in" id="custom-date-picker">
          <label className="text-xs text-surface-500 font-medium">Desde</label>
          <input type="date" className="input text-sm px-3 py-1.5" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <label className="text-xs text-surface-500 font-medium">Hasta</label>
          <input type="date" className="input text-sm px-3 py-1.5" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          <button className="btn-primary text-xs px-4 py-1.5" onClick={applyCustomRange}>Aplicar</button>
        </div>
      )}

      {/* Ganancia / Visitas tabs */}
      <div className="flex items-center gap-2" id="dashboard-tab-selector" role="tablist" aria-label="Secciones del dashboard">
        {(['ganancia', 'visitas'] as DashboardTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setDashTab(tab)}
            role="tab"
            aria-selected={dashTab === tab}
            aria-controls={`dash-panel-${tab}`}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
              dashTab === tab
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
            id={`dash-tab-${tab}`}
          >
            {tab === 'ganancia' ? 'Ganancia' : 'Visitas'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`dash-panel-${dashTab}`} aria-labelledby={`dash-tab-${dashTab}`}>
      {dashTab === 'ganancia' ? (
        <GananciaTab revBreakdown={revBreakdown} visits={visits} />
      ) : (
        <VisitasTab visits={visits} />
      )}
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
                {(() => { const IconComp = STAT_ICON_MAP[icon]; return IconComp ? <IconComp className="w-5 h-5" /> : null; })()}
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
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              Tendencias — Últimos {resolveDays(dateRange)} días
            </h2>
            <InfoTooltip explanation="Gráfico de tendencias que muestra la evolución de ingresos, transacciones y nuevos clientes en el período seleccionado." />
          </div>
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1" id="chart-tabs" role="tablist">
            {chartTabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setChartTab(key)}
                role="tab"
                aria-selected={chartTab === key}
                aria-controls={`chart-panel-${key}`}
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
          <div role="tabpanel" id={`chart-panel-${chartTab}`} aria-label={`Gráfico de ${chartConfig.name}`}>
            <div className="sr-only" aria-live="polite">
              {chartConfig.name}: {trends.length} puntos de datos. Último valor: {chartTab === 'revenue' ? `$${trends[trends.length - 1]?.revenue?.toLocaleString()}` : trends[trends.length - 1]?.[chartConfig.dataKey]?.toLocaleString()}.
            </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              {CHART_GRADIENTS}
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
          </div>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-surface-400 text-sm">
            No hay datos de tendencias aún.
          </div>
        )}
      </div>

      <DashboardInsights
        trends={trends}
        visits={visits}
        revBreakdown={revBreakdown}
        topBuyers={topBuyers}
        genders={genders}
        ages={ages}
        programTypes={programTypes}
        campaignStats={campaignStats}
        notifying={notifying}
        setNotifying={setNotifying}
        isDark={isDark}
        gridColor={gridColor}
        tickColor={tickColor}
        tooltipBg={tooltipBg}
        tooltipText={tooltipText}
        tooltipBorder={tooltipBorder}
      />

      {/* Date display footer */}
      <div className="text-center text-xs text-surface-400 py-2" id="current-date">
        Hoy — {new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}
