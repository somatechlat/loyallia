"use client";

import { useState, useEffect, useCallback } from "react";
import api, { notificationsApi, customersApi, programsApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";
import type { CampaignFormData } from "@/components/campaigns/CampaignWizard";

export interface Campaign {
  id: string;
  title: string;
  message: string;
  segment: string;
  status: string;
  sent_count: number;
  created_at: string;
  channel?: string;
}

export interface ProgramOption {
  id: string;
  name: string;
  member_count?: number;
}

export interface SegmentOption {
  id: string;
  name: string;
  count: number;
}

export function useCampaigns() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [planUsage, setPlanUsage] = useState<Record<string, number>>({});

  const loadCampaigns = useCallback(() => {
    Promise.all([
      notificationsApi.campaigns(),
      customersApi.segments(),
      programsApi.list({ limit: 100 }),
    ])
      .then(([c, s, p]) => {
        setCampaigns(c.data.campaigns || []);

        const apiSegments = (s.data.segments || []).map(
          (seg: { segment: string; count: number }) => ({
            id: seg.segment,
            name:
              seg.segment === "vip"
                ? t("campaigns.segmentVip")
                : seg.segment === "active"
                  ? t("campaigns.segmentActive")
                  : seg.segment === "at_risk"
                    ? t("campaigns.segmentAtRisk")
                    : seg.segment === "inactive"
                      ? t("campaigns.segmentInactive")
                      : seg.segment === "new"
                        ? t("campaigns.segmentNew")
                        : seg.segment,
            count: seg.count,
          }),
        );
        setSegments([
          { id: "all", name: t("campaigns.segmentAll"), count: s.data.total_customers || 0 },
          ...apiSegments,
        ]);

        const apiPrograms = p.data.programs || p.data.items || [];
        setPrograms(apiPrograms);
      })
      .catch(() => toast.error(t("campaigns.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/v1/tenants/me/plan-features/");
        setPlanFeatures(data.features || []);
        setPlanLimits(data.limits || {});
        setPlanUsage(data.usage || {});
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSubmitCampaign = useCallback(
    async (formData: CampaignFormData) => {
      const payload = {
        title: formData.title,
        message: formData.message,
        segment_id:
          formData.audience.mode === "custom" && formData.audience.customerIds.length > 0
            ? "custom"
            : formData.audience.segmentId,
        image_url: formData.imageUrl,
        channel: formData.channel,
        wallet_platform: formData.walletPlatform,
        action_url: formData.actionUrl,
        schedule_type: formData.scheduleType,
        scheduled_at: formData.scheduledAt,
        target_program_ids: formData.audience.programId === "all" ? [] : [formData.audience.programId],
        target_wallet_platform: formData.channel === "wallet" ? formData.audience.walletPlatform : "both",
        target_device_type: "both",
        target_customer_ids: formData.audience.mode === "custom" ? formData.audience.customerIds : [],
      };

      const resp = await notificationsApi.createCampaign(payload);

      const successMsg =
        formData.channel === "email"
          ? t("campaigns.emailSuccess")
          : formData.channel === "sms"
            ? t("campaigns.smsSuccess")
            : formData.channel === "whatsapp"
              ? t("campaigns.whatsappSuccess")
              : t("campaigns.walletSuccess");

      toast.success(resp.data?.message || successMsg);
      setShowWizard(false);
      loadCampaigns();
    },
    [loadCampaigns, t],
  );

  const hasEmail = planFeatures.includes("email_campaigns");
  const hasWhatsApp = planFeatures.includes("whatsapp_campaigns");
  const hasWallet = planFeatures.includes("wallet_campaigns");
  const hasSMS = planFeatures.includes("sms_campaigns");

  return {
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
    loadCampaigns,
    handleSubmitCampaign,
  };
}
