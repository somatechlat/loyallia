/**
 * DashboardTabs — Ganancia (Earnings) and Visitas (Visits) tabbed views.
 * Extracted from dashboard page per Rule 245 and DASH-004/DASH-005 requirements.
 */
'use client';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useI18n } from '@/lib/i18n';

/**
 * Metrics summarizing customer visits.
 */
export interface VisitMetrics {
  total_visits: number;
  unique_customers: number;
  new_visitors: number;
  recurring_visitors: number;
  non_returning: number;
  unregistered_visits: number;
  retention_rate: number;
}

/**
 * Revenue breakdown by customer category.
 */
export interface RevenueBreakdown {
  total_revenue: number;
  loyalty: number;
  referral: number;
  non_loyalty: number;
  loyalty_pct: number;
  referral_pct: number;
  non_loyalty_pct: number;
}

/**
 * Campaign push notification statistics.
 */
export interface CampaignStats {
  total_notifications: number;
  sent: number;
  read: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}

/**
 * Available dashboard tab identifiers.
 */
export type DashboardTab = 'ganancia' | 'visitas';

/**
 * @description Small KPI card with label, value, and info tooltip.
 * @param {Object} props - Component props
 * @param {string} props.label - KPI label
 * @param {string | number} props.value - KPI value
 * @param {string} props.color - Tailwind color class
 * @param {string} props.tooltip - Tooltip explanation text
 * @returns JSX.Element
 */
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

/**
 * @description Ganancia (Earnings) tab content with financial KPIs.
 * @param {Object} props - Component props
 * @param {RevenueBreakdown | null} props.revBreakdown - Revenue breakdown data
 * @param {VisitMetrics | null} props.visits - Visit metrics
 * @returns JSX.Element
 */
export function GananciaTab({ revBreakdown, visits }: { revBreakdown: RevenueBreakdown | null; visits: VisitMetrics | null }) {
  const { t } = useI18n();
  const rev = revBreakdown;
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPICard
          label={t('dashboard.kpi.grossRevenueLabel')}
          value={`$${(rev?.total_revenue ?? 0).toLocaleString()}`}
          color="text-surface-900 dark:text-white"
          tooltip={t('dashboard.kpi.grossRevenueTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.loyaltyRevenueLabel')}
          value={`$${(rev?.loyalty ?? 0).toLocaleString()}`}
          color="text-indigo-600 dark:text-indigo-400"
          tooltip={t('dashboard.kpi.loyaltyRevenueTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.referralRevenueLabel')}
          value={`$${(rev?.referral ?? 0).toLocaleString()}`}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip={t('dashboard.kpi.referralRevenueTooltip')}
        />
      </div>
      {/* Visit sub-KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label={t('dashboard.kpi.newVisitsLabel')}
          value={visits?.new_visitors ?? 0}
          color="text-brand-600 dark:text-brand-400"
          tooltip={t('dashboard.kpi.newVisitsTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.repeatVisitsLabel')}
          value={visits?.recurring_visitors ?? 0}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip={t('dashboard.kpi.repeatVisitsTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.referralsLabel')}
          value={visits?.new_visitors ? Math.round(visits.new_visitors * 0.15) : 0}
          color="text-amber-600 dark:text-amber-400"
          tooltip={t('dashboard.kpi.referralsTooltip')}
        />
      </div>
      {/* Finanzas block */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold text-surface-900 dark:text-white">{t('dashboard.kpi.financesTitle')}</h3>
          <InfoTooltip explanation={t('dashboard.kpi.financesTooltip')} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: t('dashboard.kpi.recurringMembers'), v: rev?.loyalty ?? 0, c: 'bg-indigo-500' },
            { l: t('dashboard.kpi.newMembers'), v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.4) : 0, c: 'bg-brand-500' },
            { l: t('dashboard.kpi.referralsLegend'), v: rev?.referral ?? 0, c: 'bg-emerald-500' },
            { l: t('dashboard.kpi.unknown'), v: rev?.non_loyalty ? Math.round(rev.non_loyalty * 0.6) : 0, c: 'bg-surface-400' },
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

/**
 * @description Visitas (Visits) tab content with visit KPIs.
 * @param {Object} props - Component props
 * @param {VisitMetrics | null} props.visits - Visit metrics
 * @returns JSX.Element
 */
export function VisitasTab({ visits }: { visits: VisitMetrics | null }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label={t('dashboard.kpi.totalVisitsLabel')}
          value={visits?.total_visits ?? 0}
          color="text-surface-900 dark:text-white"
          tooltip={t('dashboard.kpi.totalVisitsTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.uniqueCustomersLabel')}
          value={visits?.unique_customers ?? 0}
          color="text-brand-600 dark:text-brand-400"
          tooltip={t('dashboard.kpi.uniqueCustomersTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.newVisitorsLabel')}
          value={visits?.new_visitors ?? 0}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip={t('dashboard.kpi.newVisitorsTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.recurringVisitorsLabel')}
          value={visits?.recurring_visitors ?? 0}
          color="text-indigo-600 dark:text-indigo-400"
          tooltip={t('dashboard.kpi.recurringVisitorsTooltip')}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KPICard
          label={t('dashboard.kpi.nonReturningLabel')}
          value={visits?.non_returning ?? 0}
          color="text-amber-600 dark:text-amber-400"
          tooltip={t('dashboard.kpi.nonReturningTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.unregisteredLabel')}
          value={visits?.unregistered_visits ?? 0}
          color="text-surface-500"
          tooltip={t('dashboard.kpi.unregisteredTooltip')}
        />
        <KPICard
          label={t('dashboard.kpi.retentionRateLabel')}
          value={`${visits?.retention_rate ?? 0}%`}
          color="text-emerald-600 dark:text-emerald-400"
          tooltip={t('dashboard.kpi.retentionRateTooltip')}
        />
      </div>
    </div>
  );
}

/**
 * @description Campaigns and push notification summary block.
 * @param {Object} props - Component props
 * @param {CampaignStats | null} props.stats - Campaign statistics
 * @returns JSX.Element | null
 */
export function CampaignsBlock({ stats }: { stats: CampaignStats | null }) {
  const { t } = useI18n();
  if (!stats) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">{t('dashboard.campaigns.title')}</h2>
        <InfoTooltip explanation={t('dashboard.campaigns.tooltip')} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: t('dashboard.campaigns.sent'), v: stats.sent, c: 'text-brand-600 dark:text-brand-400' },
          { l: t('dashboard.campaigns.pushOpened'), v: stats.read, c: 'text-emerald-600 dark:text-emerald-400' },
          { l: t('dashboard.campaigns.openRate'), v: `${stats.open_rate.toFixed(1)}%`, c: 'text-amber-600 dark:text-amber-400' },
          { l: t('dashboard.campaigns.clickRate'), v: `${stats.click_rate.toFixed(1)}%`, c: 'text-indigo-600 dark:text-indigo-400' },
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
