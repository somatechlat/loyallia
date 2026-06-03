'use client';

import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { uploadFile } from '@/lib/upload';
import WalletNotificationPreview from '@/components/notifications/WalletNotificationPreview';
import type { CampaignFormData } from './CampaignWizard';

interface MessageComposerProps {
  data: CampaignFormData;
  onChange: (updates: Partial<CampaignFormData>) => void;
  planLimits: Record<string, number>;
  planUsage: Record<string, number>;
  errors?: Record<string, string>;
}

export default function MessageComposer({ data, onChange, planLimits, planUsage, errors = {} }: MessageComposerProps) {
  const { t } = useI18n();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://loyallia.com');
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const url = await uploadFile(file, false);
    if (url) {
      onChange({ imageUrl: url });
      toast.success(t('campaigns.imageUploaded'));
    } else {
      toast.error(t('campaigns.imageError'));
    }
    setUploadingImg(false);
  };

  // Calculate plan usage for this campaign
  const getPlanUsageInfo = () => {
    const count = data.audience.customerCount - data.audience.excludedCustomerIds.length;
    switch (data.channel) {
      case 'email':
        return {
          used: planUsage.emails_this_month || 0,
          limit: planLimits.emails_month || 0,
          needed: count,
          label: t('campaigns.emailUsageBar'),
          unlimited: false,
        };
      case 'wallet':
        return {
          used: planUsage.wallet_pushes_month || 0,
          limit: Infinity,
          needed: count,
          label: t('campaigns.walletUsageBar'),
          unlimited: true,
        };
      case 'whatsapp':
        return {
          used: planUsage.whatsapp_today || 0,
          limit: planLimits.whatsapp_day || 0,
          needed: count,
          label: t('campaigns.whatsappUsageBar'),
          unlimited: false,
        };
      case 'sms':
        return {
          used: planUsage.sms_today || 0,
          limit: planLimits.sms_day || 0,
          needed: count,
          label: t('campaigns.smsUsageBar'),
          unlimited: false,
        };
      default:
        return { used: 0, limit: 0, needed: 0, label: '', unlimited: true };
    }
  };

  const usage = getPlanUsageInfo();
  const percentage = usage.unlimited ? 0 : usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const willExceed = !usage.unlimited && usage.limit > 0 && (usage.used + usage.needed) > usage.limit;

  const titleMaxLength = data.channel === 'email' ? 200 : data.channel === 'sms' ? 160 : 100;
  const messageMaxLength = data.channel === 'email' ? 10000 : data.channel === 'sms' ? 1600 : data.channel === 'wallet' ? 500 : 1000;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Internal name */}
      <section>
        <label className="label" htmlFor="campaign-internal-name">
          {t('campaigns.internalName')}
        </label>
        <input
          id="campaign-internal-name"
          className="input"
          placeholder={t('campaigns.internalNamePlaceholder')}
          value={data.internalName}
          onChange={e => onChange({ internalName: e.target.value })}
        />
        <p className="text-[10px] text-surface-400 mt-1">{t('campaigns.internalNameHelp')}</p>
      </section>

      {/* Title */}
      <section>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="campaign-title">
            {data.channel === 'email' ? t('campaigns.emailSubject') : t('campaigns.notificationTitle')}
          </label>
          <EmojiPickerButton
            onEmojiSelect={(emoji: string) => onChange({ title: data.title + emoji })}
          />
        </div>
        <input
          id="campaign-title"
          className={`input ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          maxLength={titleMaxLength}
          placeholder={t('campaigns.titlePlaceholder')}
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.title}</p>}
        <p className="text-xs text-surface-400 mt-1">
          {data.title.length} / {titleMaxLength}
        </p>
      </section>

      {/* Image Upload - Only for Email */}
      {data.channel === 'email' && (
        <section>
          <label className="label">{t('campaigns.headerImage')}</label>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center bg-surface-50 transition-colors"
            >
              {data.imageUrl && isValidImageUrl(data.imageUrl) ? (
                <img src={data.imageUrl} alt="Header" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-2xl text-surface-400">+</span>
              )}
            </button>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div className="flex-1">
              <p className="text-xs text-surface-500">
                {data.imageUrl ? t('campaigns.imageLoaded') : t('campaigns.uploadImage')}
              </p>
              {uploadingImg && <p className="text-xs text-brand-500 mt-1">{t('campaigns.uploading')}</p>}
            </div>
            {data.imageUrl && (
              <button
                type="button"
                onClick={() => onChange({ imageUrl: '' })}
                className="text-red-500 text-xs hover:text-red-600"
              >
                {t('common.remove')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Message */}
      <section>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="campaign-message">
            {data.channel === 'email' ? t('campaigns.emailContent') : data.channel === 'sms' ? t('campaigns.smsMessage') : t('campaigns.notificationMessage')}
          </label>
          <EmojiPickerButton
            onEmojiSelect={(emoji: string) => onChange({ message: data.message + emoji })}
          />
        </div>
        {data.channel === 'email' ? (
          <>
            <textarea
              id="campaign-message"
              className={`input min-h-[120px] resize-none font-mono text-sm ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              placeholder={t('campaigns.emailPlaceholderHtml')}
              maxLength={messageMaxLength}
              value={data.message}
              onChange={e => onChange({ message: e.target.value })}
              aria-invalid={!!errors.message}
            />
            <p className="text-xs text-surface-400 mt-1">{t('campaigns.htmlHelp')}</p>
          </>
        ) : (
          <textarea
            id="campaign-message"
            className={`input min-h-[80px] resize-none ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            placeholder={t('campaigns.messagePlaceholder')}
            maxLength={messageMaxLength}
            value={data.message}
            onChange={e => onChange({ message: e.target.value })}
            aria-invalid={!!errors.message}
          />
        )}
        {errors.message && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.message}</p>}
        <p className="text-xs text-surface-400 mt-1">
          {data.message.length} / {messageMaxLength}
        </p>
      </section>

      {/* Action URL - for Wallet */}
      {data.channel === 'wallet' && (
        <section>
          <label className="label" htmlFor="campaign-action-url">
            {t('campaigns.actionUrl')}
          </label>
          <input
            id="campaign-action-url"
            className="input"
            placeholder="https://..."
            value={data.actionUrl}
            onChange={e => onChange({ actionUrl: e.target.value })}
          />
          <p className="text-[10px] text-surface-400 mt-1">{t('campaigns.actionUrlHelp')}</p>
        </section>
      )}

      {/* Schedule */}
      <section>
        <label className="label">{t('campaigns.schedule')}</label>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => onChange({ scheduleType: 'immediate', scheduledAt: null })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all
              ${data.scheduleType === 'immediate'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
              }`}
          >
            ⚡ {t('campaigns.sendImmediately')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ scheduleType: 'scheduled', scheduledAt: data.scheduledAt || '' })}
            className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all
              ${data.scheduleType === 'scheduled'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
              }`}
          >
            🕐 {t('campaigns.scheduleForLater')}
          </button>
        </div>
        {data.scheduleType === 'scheduled' && (
          <>
            <input
              type="datetime-local"
              className={`input mt-3 ${errors.scheduledAt ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              value={data.scheduledAt || ''}
              onChange={e => onChange({ scheduledAt: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              aria-invalid={!!errors.scheduledAt}
            />
            {errors.scheduledAt && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.scheduledAt}</p>}
          </>
        )}
      </section>

      {/* Preview */}
      {data.channel === 'wallet' && (
        <section className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-900/50">
          <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3">
            📱 {t('campaigns.notificationPreview')}
          </p>
          <WalletNotificationPreview
            title={data.title}
            message={data.message}
            platform={data.walletPlatform}
          />
        </section>
      )}

      {data.channel === 'email' && data.title && (
        <section className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-900/50">
          <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3">
            💌 {t('campaigns.emailPreview')}
          </p>
          <div className="bg-white dark:bg-surface-800 rounded-lg p-4 max-w-md mx-auto shadow-sm">
            <div className="border-b border-surface-200 pb-2 mb-3">
              <p className="text-xs text-surface-400">{t('campaigns.previewFrom')}: Loyallia &lt;noreply@loyallia.com&gt;</p>
              <p className="text-xs text-surface-400">{t('campaigns.previewTo')}: Juan Pérez &lt;juan@email.com&gt;</p>
              <p className="text-sm font-semibold mt-1">{data.title}</p>
            </div>
            {data.imageUrl && isValidImageUrl(data.imageUrl) && (
              <img src={data.imageUrl} alt="Header" className="w-full h-32 object-cover rounded mb-3" />
            )}
            <div
              className="text-sm text-surface-700 dark:text-surface-300 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: data.message }}
            />
          </div>
        </section>
      )}

      {/* Plan usage */}
      <section className="p-5 bg-surface-50 dark:bg-surface-800 rounded-xl">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
          📊 {t('campaigns.planUsage')}
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">{usage.label}</span>
            <span className="text-surface-900 dark:text-white font-medium">
              {usage.unlimited
                ? t('campaigns.unlimited')
                : `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`}
            </span>
          </div>
          {!usage.unlimited && (
            <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${willExceed ? 'bg-red-500' : 'bg-brand-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          <p className={`text-sm ${willExceed ? 'text-red-600 dark:text-red-400' : 'text-surface-600 dark:text-surface-400'}`}>
            {willExceed
              ? t('campaigns.willExceedLimit', { needed: usage.needed, available: Math.max(0, usage.limit - usage.used) })
              : t('campaigns.campaignWillUse', { count: usage.needed })
            }
          </p>
        </div>
      </section>
    </div>
  );
}

// Simple emoji picker button component
function EmojiPickerButton({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) {
  const emojis = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '💯', '⭐', '☕', '🍕', '🎁', '💰', '🏆', '⚡', '🚀'];
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="text-lg hover:scale-110 transition-transform p-1"
        title="Add emoji"
      >
        😀
      </button>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 p-2 grid grid-cols-5 gap-1 w-48">
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onEmojiSelect(emoji); setShowPicker(false); }}
                className="text-xl p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
