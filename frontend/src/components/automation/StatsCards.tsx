import { useI18n } from "@/lib/i18n";

interface StatsCardsProps {
  stats: { total_executions: number; success_rate: number } | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useI18n();

  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.totalExecutions")}</p>
        <p className="stat-value text-brand-600">{stats.total_executions.toLocaleString()}</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">{t("automation.stats.successRate")}</p>
        <p className="stat-value text-emerald-600">{stats.success_rate.toFixed(1)}%</p>
      </div>
    </div>
  );
}
