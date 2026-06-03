import { useI18n } from "@/lib/i18n";
import ChannelBadge from "./ChannelBadge";
import type { Campaign } from "@/hooks/useCampaigns";

interface CampaignTableProps {
  campaigns: Campaign[];
  loading: boolean;
  onNewCampaign: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  sent: "badge-green",
  queued: "badge-blue",
  draft: "badge-gray",
  failed: "badge-red",
  delivered: "badge-green",
  in_progress: "badge-blue",
  completed: "badge-green",
};

export default function CampaignTable({ campaigns, loading, onNewCampaign }: CampaignTableProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "es-EC";

  const STATUS_LABEL: Record<string, string> = {
    sent: t("campaigns.statusSent"),
    queued: t("campaigns.statusQueued"),
    draft: t("campaigns.statusDraft"),
    failed: t("campaigns.statusFailed"),
    delivered: t("campaigns.statusDelivered"),
    in_progress: t("campaigns.statusInProgress"),
    completed: t("campaigns.statusCompleted"),
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card p-16 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-surface-700 font-semibold">{t("campaigns.noCampaigns")}</p>
        <p className="text-surface-400 text-sm mt-2">{t("campaigns.createFirst")}</p>
        <button onClick={onNewCampaign} className="btn-primary mt-4">
          + {t("campaigns.newCampaign")}
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>{t("campaigns.campaign")}</th>
            <th>{t("campaigns.type")}</th>
            <th>{t("campaigns.audience")}</th>
            <th>{t("common.status")}</th>
            <th>{t("campaigns.sent")}</th>
            <th>{t("campaigns.date")}</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
              <td>
                <p className="font-medium text-surface-900 dark:text-white">{c.title}</p>
                <p className="text-xs text-surface-400 truncate max-w-[200px]">{c.message}</p>
              </td>
              <td>
                <ChannelBadge channel={c.channel} />
              </td>
              <td>
                <span className="badge-blue text-[10px]">{c.segment}</span>
              </td>
              <td>
                <span className={`${STATUS_BADGE[c.status] ?? "badge-gray"} text-[10px]`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </td>
              <td className="text-sm text-surface-700 dark:text-surface-300">{c.sent_count.toLocaleString()}</td>
              <td className="text-xs text-surface-400">{new Date(c.created_at).toLocaleDateString(dateLocale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
