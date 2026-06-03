'use client';
import { useState, useEffect } from 'react';
import api, { notificationsApi, customersApi, programsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import CampaignWizard from '@/components/campaigns/CampaignWizard';
import type { CampaignFormData } from '@/components/campaigns/CampaignWizard';
import { Mail, Smartphone, MessageCircle, Wallet } from '@/components/ui/LucideIcons';

interface Campaign {
  id: string;
  title: string;
  message: string;
  segment: string;
  status: string;
  sent_count: number;
  created_at: string;
  channel?: string;
}

interface ProgramOption {
  id: string;
  name: string;
  member_count?: number;
}

interface SegmentOption {
  id: string;
  name: string;
  count: number;
}

export default function CampaignsPage() {
  const { t, locale } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Plan Features
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [planUsage, setPlanUsage] = useState<Record<string, number>>({});

  const hasEmail = planFeatures.includes('email_campaigns');
  const hasWhatsApp = planFeatures.includes('whatsapp_campaigns');
  const hasWallet = planFeatures.includes('wallet_campaigns');
  const hasSMS = planFeatures.includes('sms_campaigns');

  const dateLocale = locale === 'en' ? 'en-US' : locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'es-EC';

  const loadCampaigns = () => {
    Promise.all([
      notificationsApi.campaigns(),
      customersApi.segments(),
      programsApi.list({ limit: 100 }),
    ])
      .then(([c, s, p]) => {
        setCampaigns(c.data.campaigns || []);

        const apiSegments = (s.data.segments || []).map((seg: { segment: string; count: number }) => ({
          id: seg.segment,
          name: seg.segment === 'vip' ? t('campaigns.segmentVip')
            : seg.segment === 'active' ? t('campaigns.segmentActive')
            : seg.segment === 'at_risk' ? t('campaigns.segmentAtRisk')
            : seg.segment === 'inactive' ? t('campaigns.segmentInactive')
            : seg.segment === 'new' ? t('campaigns.segmentNew')
            : seg.segment,
          count: seg.count,
        }));
        setSegments([
          { id: 'all', name: t('campaigns.segmentAll'), count: s.data.total_customers || 0 },
          ...apiSegments,
        ]);

        const apiPrograms = p.data.programs || p.data.items || [];
        setPrograms(apiPrograms);
      })
      .catch(() => toast.error(t('campaigns.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCampaigns(); }, []);

  // Fetch plan features
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/tenants/me/plan-features/');
        setPlanFeatures(data.features || []);
        setPlanLimits(data.limits || {});
        setPlanUsage(data.usage || {});
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSubmitCampaign = async (formData: CampaignFormData) => {
    const payload = {
      title: formData.title,
      message: formData.message,
      segment_id: formData.audience.mode === 'custom' && formData.audience.customerIds.length > 0
        ? 'custom'
        : formData.audience.segmentId,
      image_url: formData.imageUrl,
      channel: formData.channel,
      wallet_platform: formData.walletPlatform,
      action_url: formData.actionUrl,
      schedule_type: formData.scheduleType,
      scheduled_at: formData.scheduledAt,
      target_program_ids: formData.audience.programId === 'all' ? [] : [formData.audience.programId],
      target_wallet_platform: formData.channel === 'wallet' ? formData.audience.walletPlatform : 'both',
      target_device_type: 'both',
      target_customer_ids: formData.audience.mode === 'custom' ? formData.audience.customerIds : [],
    };

    const resp = await notificationsApi.createCampaign(payload);

    const successMsg = formData.channel === 'email'
      ? t('campaigns.emailSuccess')
      : formData.channel === 'sms'
        ? t('campaigns.smsSuccess')
        : formData.channel === 'whatsapp'
          ? t('campaigns.whatsappSuccess')
          : t('campaigns.walletSuccess');

    toast.success(resp.data?.message || successMsg);
    setShowWizard(false);
    loadCampaigns();
  };

  const STATUS_BADGE: Record<string, string> = {
    sent: 'badge-green',
    queued: 'badge-blue',
    draft: 'badge-gray',
    failed: 'badge-red',
    delivered: 'badge-green',
    in_progress: 'badge-blue',
    completed: 'badge-green',
  };

  const STATUS_LABEL: Record<string, string> = {
    sent: t('campaigns.statusSent'),
    queued: t('campaigns.statusQueued'),
    draft: t('campaigns.statusDraft'),
    failed: t('campaigns.statusFailed'),
    delivered: t('campaigns.statusDelivered'),
    in_progress: t('campaigns.statusInProgress'),
    completed: t('campaigns.statusCompleted'),
  };

  const ChannelBadge = ({ channel }: { channel?: string }) => {
    const configs: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
      email: { icon: <Mail className="w-3 h-3" />, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Email' },
      wallet: { icon: <Wallet className="w-3 h-3" />, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Wallet' },
      in_app: { icon: <Wallet className="w-3 h-3" />, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Wallet' },
      whatsapp: { icon: <MessageCircle className="w-3 h-3" />, bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'WhatsApp' },
      sms: { icon: <Smartphone className="w-3 h-3" />, bg: 'bg-orange-100', text: 'text-orange-700', label: 'SMS' },
    };
    const cfg = configs[channel || 'email'] || configs.email;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('campaigns.title')}</h1>
          <p className="text-surface-500 text-sm mt-1">{t('campaigns.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="btn-primary"
          id="new-campaign-btn"
        >
          + {t('campaigns.newCampaign')}
        </button>
      </div>

      {/* Usage Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{t('campaigns.campaignChannels')}</p>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-indigo-700 dark:text-indigo-300">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasEmail ? 'bg-blue-500' : 'bg-surface-300'}`} />
                <span className={hasEmail ? '' : 'opacity-50'}>
                  <b>Email:</b> {hasEmail ? `${planUsage.emails_this_month ?? 0}/${planLimits.emails_month ?? 0}` : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasWallet ? 'bg-purple-500' : 'bg-surface-300'}`} />
                <span className={hasWallet ? '' : 'opacity-50'}>
                  <b>Wallet:</b> {hasWallet ? t('campaigns.unlimited') : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasWhatsApp ? 'bg-emerald-500' : 'bg-surface-300'}`} />
                <span className={hasWhatsApp ? '' : 'opacity-50'}>
                  <b>WhatsApp:</b> {hasWhatsApp ? `${planUsage.whatsapp_today ?? 0}/${planLimits.whatsapp_day ?? 0}` : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasSMS ? 'bg-orange-500' : 'bg-surface-300'}`} />
                <span className={hasSMS ? '' : 'opacity-50'}>
                  <b>SMS:</b> {hasSMS ? `${planUsage.sms_today ?? 0}/${planLimits.sms_day ?? 0}` : t('campaigns.notAvailable')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-surface-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-surface-700 font-semibold">{t('campaigns.noCampaigns')}</p>
          <p className="text-surface-400 text-sm mt-2">{t('campaigns.createFirst')}</p>
          <button onClick={() => setShowWizard(true)} className="btn-primary mt-4">
            + {t('campaigns.newCampaign')}
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{t('campaigns.campaign')}</th>
                <th>{t('campaigns.type')}</th>
                <th>{t('campaigns.audience')}</th>
                <th>{t('common.status')}</th>
                <th>{t('campaigns.sent')}</th>
                <th>{t('campaigns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td>
                    <p className="font-medium text-surface-900 dark:text-white">{c.title}</p>
                    <p className="text-xs text-surface-400 truncate max-w-[200px]">{c.message}</p>
                  </td>
                  <td><ChannelBadge channel={c.channel} /></td>
                  <td><span className="badge-blue text-[10px]">{c.segment}</span></td>
                  <td>
                    <span className={`${STATUS_BADGE[c.status] ?? 'badge-gray'} text-[10px]`}>
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
      )}

      {/* Campaign Wizard Modal */}
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
