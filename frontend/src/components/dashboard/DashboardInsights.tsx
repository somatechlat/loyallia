import toast from 'react-hot-toast';
import { analyticsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { CampaignsBlock, type CampaignStats } from '@/components/dashboard/DashboardTabs';

/**
 * Represents a single data point in the trends chart.
 */
interface TrendPoint { [key: string]: string | number;
  /** Date string for the trend point */
  date: string;
  /** Number of transactions */
  transactions: number;
  /** Revenue amount */
  revenue: number;
  /** New customers count */
  new_customers: number;
  /** Rewards issued count */
  rewards_issued: number;
  /** Rewards redeemed count */
  rewards_redeemed: number;
}

/**
 * Metrics summarizing customer visits.
 */
interface VisitMetrics { total_visits: number; unique_customers: number; new_visitors: number; recurring_visitors: number; non_returning: number; unregistered_visits: number; retention_rate: number; }

/**
 * Represents a top buyer in the analytics view.
 */
interface TopBuyer { customer_id: string; name: string; email: string; total_spent: number; visits: number; }

/**
 * Demographic breakdown by gender.
 */
interface DemoGender { gender: string; count: number; percentage: number; }

/**
 * Demographic breakdown by age range.
 */
interface DemoAge { range: string; count: number; percentage: number; }

/**
 * Revenue breakdown by customer category.
 */
interface RevenueBreakdown { total_revenue: number; loyalty: number; referral: number; non_loyalty: number; loyalty_pct: number; referral_pct: number; non_loyalty_pct: number; }

/**
 * Performance metrics grouped by program type.
 */
interface ProgramType { type: string; label: string; visits: number; revenue: number; unique_customers: number; }

/**
 * Props for the DashboardInsights component.
 */
interface DashboardInsightsProps {
  /** Trend data points for charts */
  trends: TrendPoint[];
  /** Visit metrics summary */
  visits: VisitMetrics | null;
  /** Revenue breakdown data */
  revBreakdown: RevenueBreakdown | null;
  /** Top 15 buyers list */
  topBuyers: TopBuyer[];
  /** Gender demographic data */
  genders: DemoGender[];
  /** Age demographic data */
  ages: DemoAge[];
  /** Program type performance data */
  programTypes: ProgramType[];
  /** Campaign statistics */
  campaignStats: CampaignStats | null;
  /** Whether a notification is being sent to top buyers */
  notifying: boolean;
  /** Setter for the notifying state */
  setNotifying: (value: boolean) => void;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Grid color for charts */
  gridColor: string;
  /** Tick color for charts */
  tickColor: string;
  /** Tooltip background color */
  tooltipBg: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Tooltip border color */
  tooltipBorder: string;
}

/**
 * @description Renders dashboard analytics charts, visit metrics, and top buyers.
 * @param {DashboardInsightsProps} props - Component props
 * @returns JSX.Element
 */
export default function DashboardInsights({
  trends,
  visits,
  revBreakdown,
  topBuyers,
  genders,
  ages,
  programTypes,
  campaignStats,
  notifying,
  setNotifying,
  isDark,
  gridColor,
  tickColor,
  tooltipBg,
  tooltipText,
  tooltipBorder,
}: DashboardInsightsProps) {
  const { t } = useI18n();
  return (
    <>
      {/* Bottom grid: Demographics + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Demographics / engagement bar chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              {t('dashboard.insights.rewardsTitle')}
            </h2>
            <InfoTooltip explanation={t('dashboard.insights.rewardsTooltip')} />
          </div>

          {trends.length > 0 ? (
            <div aria-label={t('dashboard.insights.rewardsChartAriaLabel')}>
              <div className="sr-only" aria-live="polite">
                {t('dashboard.insights.rewardsSummary')} {trends.slice(-14).length} días mostrados. Emitidas: {trends.reduce((s, t) => s + (t.rewards_issued || 0), 0).toLocaleString()}. Canjeadas: {trends.reduce((s, t) => s + (t.rewards_redeemed || 0), 0).toLocaleString()}.
              </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends.slice(-14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false}
                  tickFormatter={d => d.slice(8)} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }} />
                <Bar dataKey="rewards_issued" name={t('dashboard.insights.issuedLabel')} fill="#5660ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rewards_redeemed" name={t('dashboard.insights.redeemedLabel')} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-surface-400 text-sm">
              {t('dashboard.insights.noRewardsData')}
            </div>
          )}
        </div>

        {/* Quick stats sidebar with visit metrics */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.insights.visitMetricsTitle')}</h2><InfoTooltip explanation={t('dashboard.insights.visitMetricsTooltip')} /></div>
          <div className="flex-1 flex flex-col justify-between gap-2">
            {[
              { l: t('dashboard.insights.totalVisits'), v: visits?.total_visits ?? 0, c: '' },
              { l: t('dashboard.insights.uniqueCustomers'), v: visits?.unique_customers ?? 0, c: '' },
              { l: t('dashboard.insights.newVisitors'), v: visits?.new_visitors ?? 0, c: 'text-emerald-600 dark:text-emerald-400' },
              { l: t('dashboard.insights.recurring'), v: visits?.recurring_visitors ?? 0, c: 'text-brand-600 dark:text-brand-400' },
              { l: t('dashboard.insights.nonReturning'), v: visits?.non_returning ?? 0, c: 'text-amber-600 dark:text-amber-400' },
              { l: t('dashboard.insights.retentionRate'), v: `${visits?.retention_rate ?? 0}%`, c: 'text-emerald-600 dark:text-emerald-400' },
            ].map(({ l, v, c }) => (
              <div key={l} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
                <span className="text-xs text-surface-500">{l}</span>
                <span className={`text-sm font-bold ${c || 'text-surface-900 dark:text-surface-100'}`}>{typeof v === 'number' ? v.toLocaleString() : v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown + Top Buyers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Breakdown donut */}
        <div className="card p-6" id="revenue-breakdown">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.insights.revenueBreakdownTitle')}</h2><InfoTooltip explanation={t('dashboard.insights.revenueBreakdownTooltip')} /></div>
          {revBreakdown && revBreakdown.total_revenue > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180} aria-label={t('dashboard.insights.revenueChartAriaLabel')}>
                <PieChart>
                  <Pie data={[
                    { name: t('dashboard.insights.loyaltySegment'), value: revBreakdown.loyalty, color: '#6366f1' },
                    { name: t('dashboard.insights.referralSegment'), value: revBreakdown.referral, color: '#10b981' },
                    { name: t('dashboard.insights.nonLoyaltySegment'), value: revBreakdown.non_loyalty, color: '#f59e0b' },
                  ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={42} strokeWidth={2} stroke={isDark ? '#1f2937' : '#fff'}>
                    {[
                      { name: t('dashboard.insights.loyaltySegment'), value: revBreakdown.loyalty, color: '#6366f1' },
                      { name: t('dashboard.insights.referralSegment'), value: revBreakdown.referral, color: '#10b981' },
                      { name: t('dashboard.insights.nonLoyaltySegment'), value: revBreakdown.non_loyalty, color: '#f59e0b' },
                    ].filter(d => d.value > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {[{ l: t('dashboard.insights.loyaltySegment'), v: revBreakdown.loyalty, p: revBreakdown.loyalty_pct, c: '#6366f1' },
                  { l: t('dashboard.insights.referralSegment'), v: revBreakdown.referral, p: revBreakdown.referral_pct, c: '#10b981' },
                  { l: t('dashboard.insights.nonLoyaltySegment'), v: revBreakdown.non_loyalty, p: revBreakdown.non_loyalty_pct, c: '#f59e0b' },
                ].map(r => (
                  <div key={r.l} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.c }} />{r.l}</span>
                    <span className="font-semibold">${r.v.toLocaleString()} <span className="text-surface-400 font-normal">({r.p.toFixed(0)}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-surface-400 text-sm">{t('dashboard.insights.noRevenueData')}</div>
          )}
        </div>

        {/* Top 15 Buyers */}
        <div className="card p-6 lg:col-span-2" id="top-buyers">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.insights.topBuyersTitle')}</h2><InfoTooltip explanation={t('dashboard.insights.topBuyersTooltip')} /></div>
            <button
              className="btn-primary text-xs px-3 py-1.5"
              disabled={notifying || topBuyers.length === 0}
              id="notify-top-buyers-btn"
              onClick={async () => {
                setNotifying(true);
                try {
                  await analyticsApi.notifyTopBuyers();
                  toast.success(t('dashboard.insights.notifyTopBuyersSuccess'));
                } catch { toast.error(t('dashboard.insights.notifyTopBuyersError')); }
                finally { setNotifying(false); }
              }}
            >
              {notifying ? t('common.sending') : <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> {t('dashboard.insights.notifyTop15Button')}</span>}
            </button>
          </div>
          {topBuyers.length > 0 ? (
            <div className="table-wrapper max-h-[320px] overflow-y-auto">
              <table className="table text-sm">
                <thead><tr><th>#</th><th>{t('dashboard.insights.buyerNameHeader')}</th><th>{t('dashboard.insights.buyerSpentHeader')}</th><th>{t('dashboard.insights.buyerVisitsHeader')}</th></tr></thead>
                <tbody>
                  {topBuyers.map((b, i) => (
                    <tr key={b.customer_id}>
                      <td className="text-surface-400 font-mono text-xs">{i + 1}</td>
                      <td className="font-medium truncate max-w-[200px]">{b.name}</td>
                      <td className="font-semibold text-emerald-600 dark:text-emerald-400">${b.total_spent.toFixed(2)}</td>
                      <td>{b.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-surface-400 text-sm">{t('dashboard.insights.noBuyersData')}</div>
          )}
        </div>
      </div>

      {/* Demographics + Program Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gender + Age */}
        <div className="card p-6" id="demographics">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.insights.demographicsTitle')}</h2><InfoTooltip explanation={t('dashboard.insights.demographicsTooltip')} /></div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs text-surface-500 uppercase tracking-wider mb-3">{t('dashboard.insights.genderLabel')}</h3>
              {genders.length > 0 ? genders.map(g => (
                <div key={g.gender} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{g.gender}</span><span className="font-semibold">{g.count} ({g.percentage.toFixed(0)}%)</span></div>
                  <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${g.percentage}%` }} />
                  </div>
                </div>
              )) : <p className="text-xs text-surface-400">{t('common.noData')}</p>}
            </div>
            <div>
              <h3 className="text-xs text-surface-500 uppercase tracking-wider mb-3">{t('dashboard.insights.ageLabel')}</h3>
              {ages.length > 0 ? ages.map(a => (
                <div key={a.range} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{a.range}</span><span className="font-semibold">{a.count} ({a.percentage.toFixed(0)}%)</span></div>
                  <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${a.percentage}%` }} />
                  </div>
                </div>
              )) : <p className="text-xs text-surface-400">{t('common.noData')}</p>}
            </div>
          </div>
        </div>

        {/* Visits by Program Type */}
        <div className="card p-6" id="program-type-chart">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.insights.visitsByProgramTypeTitle')}</h2><InfoTooltip explanation={t('dashboard.insights.visitsByProgramTypeTooltip')} /></div>
          {programTypes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} aria-label={`${t('dashboard.insights.programTypeChartAriaLabelPrefix')} ${programTypes.map(p => `${p.label}: ${p.visits} visitas`).join(', ')}`}>
              <BarChart data={programTypes} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${tooltipBorder}`, fontSize: 12, backgroundColor: tooltipBg, color: tooltipText }}
                  formatter={(v: number, name: string) => [name === t('dashboard.insights.revenueTooltipName') ? `$${v.toLocaleString()}` : v, name]} />
                <Bar dataKey="visits" name={t('dashboard.insights.visitsLabel')} fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-surface-400 text-sm">{t('common.noData')}</div>
          )}
        </div>
      </div>

      {/* Campaigns Block */}
      <CampaignsBlock stats={campaignStats} />


    </>
  );
}
