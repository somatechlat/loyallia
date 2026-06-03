import { useI18n } from "@/lib/i18n";

interface UsageBannerProps {
  hasEmail: boolean;
  hasWhatsApp: boolean;
  hasWallet: boolean;
  hasSMS: boolean;
  planLimits: Record<string, number>;
  planUsage: Record<string, number>;
}

export default function UsageBanner({ hasEmail, hasWhatsApp, hasWallet, hasSMS, planLimits, planUsage }: UsageBannerProps) {
  const { t } = useI18n();
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{t("campaigns.campaignChannels")}</p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-indigo-700 dark:text-indigo-300">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasEmail ? "bg-blue-500" : "bg-surface-300"}`} />
              <span className={hasEmail ? "" : "opacity-50"}>
                <b>{t("campaigns.email")}:</b> {hasEmail ? `${planUsage.emails_this_month ?? 0}/${planLimits.emails_month ?? 0}` : t("campaigns.notAvailable")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasWallet ? "bg-purple-500" : "bg-surface-300"}`} />
              <span className={hasWallet ? "" : "opacity-50"}>
                <b>{t("campaigns.wallet")}:</b> {hasWallet ? t("campaigns.unlimited") : t("campaigns.notAvailable")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasWhatsApp ? "bg-emerald-500" : "bg-surface-300"}`} />
              <span className={hasWhatsApp ? "" : "opacity-50"}>
                <b>{t("campaigns.whatsapp")}:</b> {hasWhatsApp ? `${planUsage.whatsapp_today ?? 0}/${planLimits.whatsapp_day ?? 0}` : t("campaigns.notAvailable")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasSMS ? "bg-orange-500" : "bg-surface-300"}`} />
              <span className={hasSMS ? "" : "opacity-50"}>
                <b>{t("campaigns.sms")}:</b> {hasSMS ? `${planUsage.sms_today ?? 0}/${planLimits.sms_day ?? 0}` : t("campaigns.notAvailable")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
