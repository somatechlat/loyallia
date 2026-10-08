"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  /** Active enrollment count from lightweight list API. */
  member_count?: number;
}

export interface SegmentOption {
  id: string;
  name: string;
  count: number;
}

export function useCampaigns() {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [planUsage, setPlanUsage] = useState<Record<string, number>>({});

  // Stable loader — never depend on `t` (unstable context fns re-fetch forever).
  const loadCampaigns = useCallback(() => {
    const tr = tRef.current;
    Promise.all([
      notificationsApi.campaigns(),
      customersApi.segments(),
      programsApi.list(),
    ])
      .then(([c, s, p]) => {
        setCampaigns(c.data.campaigns || []);

        const apiSegments = (s.data.segments || []).map(
          (seg: { segment: string; count: number }) => ({
            id: seg.segment,
            name:
              seg.segment === "vip"
                ? tr("campaigns.segmentVip")
                : seg.segment === "active"
                  ? tr("campaigns.segmentActive")
                  : seg.segment === "at_risk"
                    ? tr("campaigns.segmentAtRisk")
                    : seg.segment === "inactive"
                      ? tr("campaigns.segmentInactive")
                      : seg.segment === "new"
                        ? tr("campaigns.segmentNew")
                        : seg.segment,
            count: seg.count,
          }),
        );
        setSegments([
          { id: "all", name: tr("campaigns.segmentAll"), count: s.data.total_customers || 0 },
          ...apiSegments,
        ]);

        const apiPrograms = (p.data.programs || p.data.items || []).map(
          (prog: {
            id: string;
            name: string;
            enrollments_count?: number;
            member_count?: number;
          }) => ({
            id: prog.id,
            name: prog.name,
            member_count: Number(
              prog.enrollments_count ?? prog.member_count ?? 0
            ),
          })
        );
        setPrograms(apiPrograms);
      })
      .catch(() => toast.error(tr("campaigns.loadError")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/v1/tenants/me/plan-features/");
        if (cancelled) return;
        setPlanFeatures(data.features || []);
        setPlanLimits(data.limits || {});
        setPlanUsage(data.usage || {});
      } catch {
        if (!cancelled) toast.error(tRef.current("campaigns.planFeaturesLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
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
        ...(formData.channel === "whatsapp"
          ? {
              whatsapp_session_id: formData.whatsappFanout ? null : formData.whatsappSessionId,
              whatsapp_fanout: formData.whatsappFanout,
            }
          : {}),
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
