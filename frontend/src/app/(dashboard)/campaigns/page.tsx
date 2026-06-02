'use client';
import { useState, useEffect, useRef } from 'react';
import api, { notificationsApi, customersApi, programsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import Tooltip from '@/components/ui/Tooltip';
import { uploadFile } from '@/lib/upload';
import WalletPlatformSelector from '@/components/notifications/WalletPlatformSelector';
import WalletNotificationPreview from '@/components/notifications/WalletNotificationPreview';
import EmojiPickerButton from '@/components/ui/EmojiPickerButton';
import { Mail, Smartphone, MessageCircle, AlertTriangle, Send, BarChart3, Wallet } from '@/components/ui/LucideIcons';

function SegmentIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'all': return <svg className="w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
    case 'vip': return <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case 'active': return <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
    case 'at_risk': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'inactive': return <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M8 15h8M9 9h.01M15 9h.01"/></svg>;
    case 'new': return <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
    case 'chart': return <BarChart3 className="w-5 h-5 text-surface-500" />;
    default: return <BarChart3 className="w-5 h-5 text-surface-500" />;
  }
}

interface Campaign {
  id: string; title: string; message: string; segment: string;
  status: string; sent_count: number; created_at: string;
  channel?: string;
}

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export default function CampaignsPage() {
  const { t, locale } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<{id: string; name: string; member_count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [campaignType, setCampaignType] = useState<'email' | 'wallet' | 'whatsapp' | 'sms'>('wallet');
  const [form, setForm] = useState({ title: '', message: '', segment_id: 'all', image_url: '' });
  const [walletPlatform, setWalletPlatform] = useState<'apple' | 'google' | 'both'>('both');
  const [programs, setPrograms] = useState<{id: string; name: string}[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [targetDeviceType, setTargetDeviceType] = useState<'both' | 'ios' | 'android'>('both');
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Plan Features (LYL-SRS-008)
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [planUsage, setPlanUsage] = useState<Record<string, number>>({});

  const hasEmail = planFeatures.includes('email_campaigns');
  const hasWhatsApp = planFeatures.includes('whatsapp_campaigns');
  const hasWallet = planFeatures.includes('wallet_campaigns');
  const hasSMS = planFeatures.includes('sms_campaigns');

  const dateLocale = locale === 'en' ? 'en-US' : locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'es-EC';

  const load = () => {
    Promise.all([notificationsApi.campaigns(), customersApi.segments()])
      .then(([c, s]) => {
        setCampaigns(c.data.campaigns || []);
        const apiSegments = (s.data.segments || []).map((seg: { segment: string; count: number }) => ({
          id: seg.segment,
          name: seg.segment === 'vip' ? t('campaigns.segmentVip') : seg.segment === 'active' ? t('campaigns.segmentActive') : seg.segment === 'at_risk' ? t('campaigns.segmentAtRisk') : seg.segment === 'inactive' ? t('campaigns.segmentInactive') : seg.segment === 'new' ? t('campaigns.segmentNew') : seg.segment,
          member_count: seg.count,
        }));
        setSegments([{ id: 'all', name: t('campaigns.segmentAll'), member_count: s.data.total_customers || 0 }, ...apiSegments]);
      })
      .catch(() => toast.error(t('campaigns.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Fetch programs for targeting
  useEffect(() => {
    programsApi.list({ limit: 100 })
      .then(({ data }) => setPrograms(data.programs || data.items || []))
      .catch(() => toast.error(t('campaigns.programsLoadError')));
  }, [t]);

  // Fetch plan features on mount (LYL-SRS-008)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/v1/tenants/me/plan-features/');
        setPlanFeatures(data.features || []);
        setPlanLimits(data.limits || {});
        setPlanUsage(data.usage || {});
        // Default to first available channel (LYL-SRS-008)
        if (data.features?.includes('wallet_campaigns')) {
          setCampaignType('wallet');
        } else if (data.features?.includes('email_campaigns')) {
          setCampaignType('email');
        } else if (data.features?.includes('whatsapp_campaigns')) {
          setCampaignType('whatsapp');
        } else if (data.features?.includes('sms_campaigns')) {
          setCampaignType('sms');
        }
      } catch { /* no plan info — keep current default */ }
    })();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const url = await uploadFile(file, false);
    if (url) {
      setForm(f => ({ ...f, image_url: url }));
      toast.success(t('campaigns.imageUploaded'));
    } else {
      toast.error(t('campaigns.imageError'));
    }
    setUploadingImg(false);
  };

  const sendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error(t('campaigns.fillFields')); return; }
    setSending(true);

    try {
      // Send to appropriate endpoint based on campaign type
      const payload = {
        ...form,
        channel: campaignType,
        title: form.title,
        message: form.message,
        target_wallet_platform: walletPlatform,
        target_program_ids: selectedPrograms,
        target_device_type: targetDeviceType,
      };

      const resp = await notificationsApi.createCampaign(payload);

      const successMsg = campaignType === 'email'
        ? t('campaigns.emailSuccess')
        : campaignType === 'sms'
          ? t('campaigns.smsSuccess')
          : t('campaigns.walletSuccess');

      toast.success(resp.data?.message || successMsg);
      setShowForm(false);
      setForm({ title: '', message: '', segment_id: 'all', image_url: '' });
      setSelectedPrograms([]);
      setTargetDeviceType('both');
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('campaigns.sendError');
      toast.error(msg);
    }
    finally { setSending(false); }
  };

  const STATUS_BADGE: Record<string, string> = {
    sent: 'badge-green', queued: 'badge-blue', draft: 'badge-gray', failed: 'badge-red', delivered: 'badge-green',
  };

  const STATUS_LABEL: Record<string, string> = {
    sent: t('campaigns.statusSent'),
    queued: t('campaigns.statusQueued'),
    draft: t('campaigns.statusDraft'),
    failed: t('campaigns.statusFailed'),
    delivered: t('campaigns.statusDelivered'),
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('campaigns.title')}</h1>
          <p className="text-surface-500 text-sm mt-1">{t('campaigns.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" id="new-campaign-btn">
          {showForm ? t('common.cancel') : t('campaigns.newCampaign')}
        </button>
      </div>

      {/* Info Banner (LYL-SRS-008: dynamic per plan) */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900">{t('campaigns.campaignChannels')}</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-indigo-700">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasEmail ? 'bg-blue-500' : 'bg-surface-300'}`}></span>
                <span className={hasEmail ? '' : 'opacity-50'}>
                  <b>{t('campaigns.email')}:</b> {hasEmail ? t('campaigns.emailUsage', { used: (planUsage.emails_this_month ?? 0).toLocaleString(), limit: (planLimits.emails_month ?? 0).toLocaleString() }) : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasWallet ? 'bg-purple-500' : 'bg-surface-300'}`}></span>
                <span className={hasWallet ? '' : 'opacity-50'}>
                  <b>{t('campaigns.wallet')}:</b> {hasWallet ? t('campaigns.walletInfo') : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasWhatsApp ? 'bg-emerald-500' : 'bg-surface-300'}`}></span>
                <span className={hasWhatsApp ? '' : 'opacity-50'}>
                  <b>{t('campaigns.whatsapp')}:</b> {hasWhatsApp ? t('campaigns.whatsappUsage', { used: planUsage.whatsapp_today ?? 0, limit: planLimits.whatsapp_day ?? 0 }) : t('campaigns.notAvailable')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasSMS ? 'bg-orange-500' : 'bg-surface-300'}`}></span>
                <span className={hasSMS ? '' : 'opacity-50'}>
                  <b>{t('campaigns.sms')}:</b> {hasSMS ? t('campaigns.smsUsage', { used: planUsage.sms_today ?? 0, limit: planLimits.sms_day ?? 0 }) : t('campaigns.notAvailable')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-base font-semibold mb-4">{t('campaigns.newCampaignTitle')}</h2>

          {/* Campaign Type Selector (LYL-SRS-008: plan-gated) */}
          <div className="mb-4">
            <label className="label">{t('campaigns.campaignType')}</label>
            <div className="flex gap-3 mt-2 flex-wrap">
              {/* Email — locked if plan lacks email_campaigns */}
              <button
                type="button"
                disabled={!hasEmail}
                onClick={() => hasEmail && setCampaignType('email')} aria-pressed={campaignType === 'email'}
                className={`flex-1 p-4 rounded-xl border-2 transition-all relative min-w-[140px] ${
                  !hasEmail
                    ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed'
                    : campaignType === 'email'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{t('campaigns.email')}</span>
                  {!hasEmail && <span className="ml-auto text-xs">🔒</span>}
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  {hasEmail ? t('campaigns.emailDesc') : t('campaigns.upgradePlan')}
                </p>
              </button>

              {/* Wallet — dynamically gated by wallet_campaigns (LYL-SRS-008) */}
              <button
                type="button"
                disabled={!hasWallet}
                onClick={() => hasWallet && setCampaignType('wallet')} aria-pressed={campaignType === 'wallet'}
                className={`flex-1 p-4 rounded-xl border-2 transition-all relative min-w-[140px] ${
                  !hasWallet
                    ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed'
                    : campaignType === 'wallet'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="font-medium">{t('campaigns.wallet')}</span>
                  {!hasWallet && <span className="ml-auto text-xs">🔒</span>}
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  {hasWallet ? t('campaigns.walletDesc') : t('campaigns.upgradePlan')}
                </p>
              </button>

              {/* WhatsApp — locked if plan lacks whatsapp_campaigns */}
              <button
                type="button"
                disabled={!hasWhatsApp}
                onClick={() => hasWhatsApp && setCampaignType('whatsapp')} aria-pressed={campaignType === 'whatsapp'}
                className={`flex-1 p-4 rounded-xl border-2 transition-all relative min-w-[140px] ${
                  !hasWhatsApp
                    ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed'
                    : campaignType === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.24l-.31-.18-2.87.85.85-2.87-.2-.31A8 8 0 1112 20z"/>
                  </svg>
                  <span className="font-medium">{t('campaigns.whatsapp')}</span>
                  {!hasWhatsApp && <span className="ml-auto text-xs">🔒</span>}
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  {hasWhatsApp ? t('campaigns.whatsappDesc') : t('campaigns.upgradePlan')}
                </p>
              </button>

              {/* SMS — locked if plan lacks sms_campaigns */}
              <button
                type="button"
                disabled={!hasSMS}
                onClick={() => hasSMS && setCampaignType('sms')} aria-pressed={campaignType === 'sms'}
                className={`flex-1 p-4 rounded-xl border-2 transition-all relative min-w-[140px] ${
                  !hasSMS
                    ? 'border-surface-200 dark:border-surface-700 opacity-50 cursor-not-allowed'
                    : campaignType === 'sms'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium">{t('campaigns.sms')}</span>
                  {!hasSMS && <span className="ml-auto text-xs">🔒</span>}
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  {hasSMS ? t('campaigns.smsDesc') : t('campaigns.upgradePlan')}
                </p>
              </button>
            </div>

            {/* WhatsApp Rate Info Banner (LYL-SRS-006) */}
            {campaignType === 'whatsapp' && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{t('campaigns.whatsappLimits')}</p>
                    <ul className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                      <li>{t('campaigns.whatsappRate1')}</li>
                      <li>{t('campaigns.whatsappRate2')}</li>
                      <li>{t('campaigns.whatsappRate3')}</li>
                      <li>{t('campaigns.whatsappRate4')}</li>
                    </ul>
                    <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-2">{t('campaigns.whatsappProtection')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Info Banner */}
            {campaignType === 'sms' && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">{t('campaigns.smsInfo')}</p>
                    <ul className="mt-1 text-xs text-orange-700 dark:text-orange-300 space-y-1">
                      <li>{t('campaigns.smsInfo1')}</li>
                      <li>{t('campaigns.smsInfo2')}</li>
                      <li>{t('campaigns.smsInfo3')}</li>
                      <li>{t('campaigns.smsInfo4')}</li>
                    </ul>
                    <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-2">{t('campaigns.smsVerify')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendCampaign} className="space-y-4">
            {/* Wallet Platform Selector */}
            {campaignType === 'wallet' && (
              <div>
                <label className="label">{t('campaigns.walletPlatform')}</label>
                <WalletPlatformSelector value={walletPlatform} onChange={setWalletPlatform} />
                <p className="text-[10px] text-surface-400 mt-1.5">
                  {t('campaigns.walletPlatformHelp')}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="campaign-title">
                  {campaignType === 'email' ? t('campaigns.emailSubject') : campaignType === 'sms' ? t('campaigns.smsTitle') : t('campaigns.notificationTitle')}
                </label>
                <EmojiPickerButton
                  onEmojiSelect={emoji => setForm(f => ({ ...f, title: f.title + emoji }))}
                />
              </div>
              <input id="campaign-title" className="input" maxLength={200} placeholder={campaignType === 'email' ? t('campaigns.emailPlaceholder') : campaignType === 'sms' ? t('campaigns.smsTitlePlaceholder') : t('campaigns.walletTitlePlaceholder')}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Image Upload - Only for Email */}
            {campaignType === 'email' && (
              <div>
                <label className="label">{t('campaigns.headerImage')}</label>
                <div className="flex items-center gap-3 mt-1">
                  <button type="button" onClick={() => imgInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center bg-surface-50">
                    {form.image_url && isValidImageUrl(form.image_url) ? (
                      <img src={form.image_url} alt={t('campaigns.headerImage')} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-xs text-surface-400">+</span>
                    )}
                  </button>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <div className="flex-1">
                    <p className="text-xs text-surface-500">{form.image_url ? t('campaigns.imageLoaded') : t('campaigns.uploadImage')}</p>
                    {uploadingImg && <p className="text-xs text-brand-500">{t('campaigns.uploading')}</p>}
                  </div>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-red-500 text-xs">{t('campaigns.remove')}</button>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="campaign-msg">
                  {campaignType === 'email' ? t('campaigns.emailContent') : campaignType === 'sms' ? t('campaigns.smsMessage') : t('campaigns.notificationMessage')}
                </label>
                <EmojiPickerButton
                  onEmojiSelect={emoji => setForm(f => ({ ...f, message: f.message + emoji }))}
                />
              </div>
              {campaignType === 'email' ? (
                <>
                  <textarea id="campaign-msg"
                    className="input min-h-[120px] resize-none font-mono text-sm"
                    placeholder={t('campaigns.emailPlaceholderHtml')}
                    maxLength={10000}
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                  <p className="text-xs text-surface-400 mt-1">{t('campaigns.htmlHelp')}</p>
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t('campaigns.htmlSanitized')}</p>
                </>
              ) : (
                <textarea id="campaign-msg"
                  className="input min-h-[80px] resize-none"
                  placeholder={campaignType === 'sms' ? t('campaigns.smsPlaceholder') : t('campaigns.walletPlaceholder')}
                  maxLength={campaignType === 'sms' ? 1600 : campaignType === 'wallet' ? 178 : undefined}
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              )}
            </div>

            {/* Wallet Notification Preview */}
            {campaignType === 'wallet' && (
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-900/50">
                <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3">
                  <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{t('campaigns.notificationPreview')}
                </p>
                <WalletNotificationPreview
                  title={form.title}
                  message={form.message}
                  platform={walletPlatform}
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="label mb-0">{t('campaigns.recipientSegment')}</label>
                <Tooltip text={t('campaigns.segmentTooltip')} />
              </div>
              {/* Segment Wizard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {segments.map(s => {
                  const segmentMeta: Record<string, { icon: string; desc: string; color: string; darkColor: string }> = {
                    all:      { icon: 'all', desc: t('campaigns.segmentAllDesc'), color: 'border-brand-500 bg-brand-50', darkColor: 'dark:bg-brand-900/20' },
                    vip:      { icon: 'vip', desc: t('campaigns.segmentVipDesc'), color: 'border-amber-500 bg-amber-50', darkColor: 'dark:bg-amber-900/20' },
                    active:   { icon: 'active', desc: t('campaigns.segmentActiveDesc'), color: 'border-emerald-500 bg-emerald-50', darkColor: 'dark:bg-emerald-900/20' },
                    at_risk:  { icon: 'at_risk', desc: t('campaigns.segmentAtRiskDesc'), color: 'border-orange-500 bg-orange-50', darkColor: 'dark:bg-orange-900/20' },
                    inactive: { icon: 'inactive', desc: t('campaigns.segmentInactiveDesc'), color: 'border-red-400 bg-red-50', darkColor: 'dark:bg-red-900/20' },
                    new:      { icon: 'new', desc: t('campaigns.segmentNewDesc'), color: 'border-blue-500 bg-blue-50', darkColor: 'dark:bg-blue-900/20' },
                  };
                  const meta = segmentMeta[s.id] ?? { icon: 'chart', desc: `${t('campaigns.segment')}: ${s.name}`, color: 'border-surface-300 bg-surface-50', darkColor: 'dark:bg-surface-800' };
                  const isSelected = form.segment_id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, segment_id: s.id }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? `${meta.color} ${meta.darkColor} shadow-md`
                          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                      id={`segment-${s.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl"><SegmentIcon icon={meta.icon} /></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-surface-900 dark:text-white truncate">{s.name}</p>
                            {isSelected && (
                              <svg className="w-4 h-4 text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{meta.desc}</p>
                          <p className="text-xs font-bold mt-2 text-brand-600 dark:text-brand-400">
                            {s.member_count.toLocaleString()} {s.member_count !== 1 ? t('campaigns.clients') : t('campaigns.client')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Selected summary */}
              {form.segment_id && (
                <div className="mt-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl flex items-center gap-2">
                  <span className="text-xs text-surface-500 flex items-center gap-1"><Send className="w-3 h-3" /> {t('campaigns.sendingTo')}</span>
                  <span className="text-xs font-bold text-surface-900 dark:text-white">
                    {segments.find(s => s.id === form.segment_id)?.member_count.toLocaleString() ?? 0} {t('campaigns.clients')}
                  </span>
                  <span className="text-xs text-surface-500">{t('campaigns.fromSegment')}</span>
                  <span className="badge-purple text-[10px]">
                    {segments.find(s => s.id === form.segment_id)?.name ?? form.segment_id}
                  </span>
                </div>
              )}
            </div>

            {/* Program & Device Targeting */}
            <div className="space-y-4 pt-4 border-t border-surface-200 dark:border-surface-700">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="label mb-0">{t('campaigns.filterByProgram')}</label>
                  <Tooltip text={t('campaigns.programTooltip')} />
                </div>
                {programs.length === 0 ? (
                  <p className="text-xs text-surface-400">{t('campaigns.noPrograms')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {programs.map(p => {
                      const isSelected = selectedPrograms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPrograms(prev => isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                          className={`text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-surface-900 dark:text-white truncate">{p.name}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="label" htmlFor="target-device-type">{t('campaigns.deviceType')}</label>
                <select
                  id="target-device-type"
                  className="input min-w-[200px]"
                  value={targetDeviceType}
                  onChange={e => setTargetDeviceType(e.target.value as 'both' | 'ios' | 'android')}
                >
                  <option value="both">{t('campaigns.allDevices')}</option>
                  <option value="ios">{t('campaigns.iosDevices')}</option>
                  <option value="android">{t('campaigns.androidDevices')}</option>
                </select>
                <p className="text-[10px] text-surface-400 mt-1">{t('campaigns.deviceFilterHelp')}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1" id="cancel-campaign-btn">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={sending} id="send-campaign-btn">
                {sending ? <span className="spinner w-4 h-4" /> : `${t('campaigns.sendCampaign')} ${campaignType === 'email' ? t('campaigns.sendEmail') : campaignType === 'wallet' ? t('campaigns.sendWallet') : campaignType === 'sms' ? t('campaigns.sendSms') : t('campaigns.sendWhatsapp')}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-surface-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </div>
          <p className="text-surface-700 font-semibold">{t('campaigns.noCampaigns')}</p>
          <p className="text-surface-400 text-sm mt-2">{t('campaigns.createFirst')}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>{t('campaigns.campaign')}</th><th>{t('campaigns.type')}</th><th>{t('campaigns.segment')}</th><th>{t('common.status')}</th><th>{t('campaigns.sent')}</th><th>{t('campaigns.date')}</th></tr></thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-surface-400 truncate max-w-[200px]">{c.message}</p>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.channel === 'email' ? 'bg-blue-100 text-blue-700' :
                      (c.channel === 'wallet' || c.channel === 'in_app') ? 'bg-purple-100 text-purple-700' :
                      c.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' :
                      c.channel === 'sms' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {c.channel === 'email' ? <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span> :
                       (c.channel === 'wallet' || c.channel === 'in_app') ? <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</span> :
                       c.channel === 'whatsapp' ? <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</span> :
                       c.channel === 'sms' ? <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> SMS</span> :
                       c.channel?.toUpperCase() || 'Email'}
                    </span>
                  </td>
                  <td><span className="badge-blue">{c.segment}</span></td>
                  <td><span className={STATUS_BADGE[c.status] ?? 'badge-gray'}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                  <td>{c.sent_count.toLocaleString()}</td>
                  <td className="text-xs text-surface-400">{new Date(c.created_at).toLocaleDateString(dateLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
