"use client";

import { useCampaigns } from "@/hooks/useCampaigns";
import { useI18n } from "@/lib/i18n";
import CampaignWizard from "@/components/campaigns/CampaignWizard";
import UsageBanner from "@/components/campaigns/UsageBanner";
import CampaignTable from "@/components/campaigns/CampaignTable";

export default function CampaignsPage() {
  const { t } = useI18n();
  const {
    campaigns,
    segments,
    programs,
    loading,
    showWizard,
    setShowWizard,
    planFeatures,
    planLimits,
    planUsage,
    hasEmail,
    hasWhatsApp,
    hasWallet,
    hasSMS,
    handleSubmitCampaign,
  } = useCampaigns();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("campaigns.title")}</h1>
          <p className="text-surface-500 text-sm mt-1">{t("campaigns.subtitle")}</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary" id="new-campaign-btn">
          + {t("campaigns.newCampaign")}
        </button>
      </div>

      <UsageBanner
        hasEmail={hasEmail}
        hasWhatsApp={hasWhatsApp}
        hasWallet={hasWallet}
        hasSMS={hasSMS}
        planLimits={planLimits}
        planUsage={planUsage}
      />

      <CampaignTable campaigns={campaigns} loading={loading} onNewCampaign={() => setShowWizard(true)} />

      <CampaignWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSubmit={handleSubmitCampaign}
        programs={programs}
        segments={segments}
        planFeatures={planFeatures}
        planLimits={planLimits}
        planUsage={planUsage}
      />
    </div>
  );
}
