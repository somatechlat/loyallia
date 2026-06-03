'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import ChannelSelector from './ChannelSelector';
import AudienceSelector from './AudienceSelector';
import MessageComposer from './MessageComposer';
import CampaignWizardStepIndicator from './CampaignWizardStepIndicator';

export type CampaignChannel = 'email' | 'wallet' | 'whatsapp' | 'sms';
export type WalletPlatform = 'apple' | 'google' | 'both';

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

export interface AudienceSelection {
  mode: 'preset' | 'custom';
  programId: string | 'all';
  walletPlatform: WalletPlatform;
  segmentId: string;
  customerIds: string[];
  excludedCustomerIds: string[];
  customerCount: number;
  label: string;
}

export interface CampaignFormData {
  internalName: string;
  title: string;
  message: string;
  imageUrl: string;
  actionUrl: string;
  channel: CampaignChannel;
  walletPlatform: WalletPlatform;
  audience: AudienceSelection;
  scheduleType: 'immediate' | 'scheduled';
  scheduledAt: string | null;
}

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  programs: ProgramOption[];
  segments: SegmentOption[];
  planFeatures: string[];
  planLimits: Record<string, number>;
  planUsage: Record<string, number>;
}

const STEPS = [
  { id: 0, label: 'campaigns.stepChannel', labelShort: 'campaigns.channel' },
  { id: 1, label: 'campaigns.stepAudience', labelShort: 'campaigns.audience' },
  { id: 2, label: 'campaigns.stepCompose', labelShort: 'campaigns.compose' },
];

export default function CampaignWizard({
  isOpen,
  onClose,
  onSubmit,
  programs,
  segments,
  planFeatures,
  planLimits,
  planUsage,
}: CampaignWizardProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const hasEmail = planFeatures.includes('email_campaigns');
  const hasWhatsApp = planFeatures.includes('whatsapp_campaigns');
  const hasWallet = planFeatures.includes('wallet_campaigns');
  const hasSMS = planFeatures.includes('sms_campaigns');

  const defaultChannel: CampaignChannel = hasWallet ? 'wallet' : hasEmail ? 'email' : hasWhatsApp ? 'whatsapp' : 'sms';

  const [formData, setFormData] = useState<CampaignFormData>({
    internalName: '',
    title: '',
    message: '',
    imageUrl: '',
    actionUrl: '',
    channel: defaultChannel,
    walletPlatform: 'both',
    audience: {
      mode: 'preset',
      programId: 'all',
      walletPlatform: 'both',
      segmentId: 'all',
      customerIds: [],
      excludedCustomerIds: [],
      customerCount: 0,
      label: t('campaigns.segmentAll'),
    },
    scheduleType: 'immediate',
    scheduledAt: null,
  });

  // Focus management + body scroll lock + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const updateForm = useCallback(
    (updates: Partial<CampaignFormData>) => {
      setFormData(prev => ({ ...prev, ...updates }));
    },
    []
  );

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  }, [step]);

  const canProceed = useCallback(() => {
    if (step === 0) {
      // Step 1: must have a valid channel based on plan
      if (formData.channel === 'email' && !hasEmail) return false;
      if (formData.channel === 'wallet' && !hasWallet) return false;
      if (formData.channel === 'whatsapp' && !hasWhatsApp) return false;
      if (formData.channel === 'sms' && !hasSMS) return false;
      return true;
    }
    if (step === 1) {
      // Step 2: must have valid audience
      return formData.audience.customerCount > 0;
    }
    if (step === 2) {
      // Step 3: must have title and message
      return formData.title.trim().length > 0 && formData.message.trim().length > 0;
    }
    return false;
  }, [step, formData, hasEmail, hasWallet, hasWhatsApp, hasSMS]);

  const handleSubmit = useCallback(
    async (scheduleType: 'immediate' | 'scheduled' = 'immediate', scheduledAt: string | null = null) => {
      if (!canProceed()) {
        toast.error(t('campaigns.fillFields'));
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit({ ...formData, scheduleType, scheduledAt });
        // Reset after successful submit
        setStep(0);
        setFormData({
          internalName: '',
          title: '',
          message: '',
          imageUrl: '',
          actionUrl: '',
          channel: defaultChannel,
          walletPlatform: 'both',
          audience: {
            mode: 'preset',
            programId: 'all',
            walletPlatform: 'both',
            segmentId: 'all',
            customerIds: [],
            excludedCustomerIds: [],
            customerCount: 0,
            label: t('campaigns.segmentAll'),
          },
          scheduleType: 'immediate',
          scheduledAt: null,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('campaigns.sendError');
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canProceed, formData, onSubmit, t, defaultChannel]
  );

  if (!isOpen) return null;

  const stepLabels = STEPS.map(s => t(s.label));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-surface-900 rounded-3xl shadow-2xl w-[96vw] h-[92vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-wizard-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => !isSubmitting && onClose()}
              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1 transition-colors"
              aria-label={t('common.cancel')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h2 id="campaign-wizard-title" className="text-lg font-bold text-surface-900 dark:text-white">
              {t('campaigns.newCampaignTitle')}
            </h2>
          </div>
          <CampaignWizardStepIndicator steps={stepLabels} currentStep={step} />
        </div>

        {/* Sticky summary bar */}
        <div className="px-8 py-3 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-surface-500">{t('campaigns.summary')}:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
              {formData.channel === 'email' && '💌 Email'}
              {formData.channel === 'wallet' && '📱 Wallet'}
              {formData.channel === 'whatsapp' && '💬 WhatsApp'}
              {formData.channel === 'sms' && '📨 SMS'}
            </span>
            {step >= 1 && (
              <>
                <span className="text-surface-300">→</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-medium">
                  {formData.audience.programId === 'all'
                    ? t('campaigns.allPrograms')
                    : programs.find(p => p.id === formData.audience.programId)?.name || formData.audience.programId}
                </span>
              </>
            )}
            {step >= 1 && formData.channel === 'wallet' && (
              <>
                <span className="text-surface-300">→</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  {formData.audience.walletPlatform === 'apple' && '🍎 Apple'}
                  {formData.audience.walletPlatform === 'google' && '🤖 Google'}
                  {formData.audience.walletPlatform === 'both' && '✓ Todos'}
                </span>
              </>
            )}
            {step >= 1 && (
              <>
                <span className="text-surface-300">→</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  👥 {formData.audience.customerCount.toLocaleString()} {t('campaigns.clients')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 0 && (
            <ChannelSelector
              value={formData.channel}
              onChange={(channel) => updateForm({ channel })}
              planFeatures={planFeatures}
              planLimits={planLimits}
              planUsage={planUsage}
              programs={programs}
              onQuickPreset={(programId, segmentId, walletPlatform) => {
                const program = programs.find(p => p.id === programId);
                const segment = segments.find(s => s.id === segmentId);
                updateForm({
                  audience: {
                    mode: 'preset',
                    programId,
                    walletPlatform,
                    segmentId,
                    customerIds: [],
                    excludedCustomerIds: [],
                    customerCount: segment?.count || 0,
                    label: segment?.name || t('campaigns.segmentAll'),
                  },
                });
                // Skip step 2 (audience) if using a quick preset
                setStep(2);
              }}
              onCustomSelected={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <AudienceSelector
              programs={programs}
              segments={segments}
              channel={formData.channel}
              walletPlatform={formData.walletPlatform}
              value={formData.audience}
              onChange={(audience) => updateForm({ audience })}
            />
          )}

          {step === 2 && (
            <MessageComposer
              data={formData}
              onChange={updateForm}
              planLimits={planLimits}
              planUsage={planUsage}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between flex-shrink-0">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="btn-ghost text-sm"
              >
                ← {t('common.back')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="btn-primary px-6"
              >
                {t('common.continue')} →
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit('scheduled', formData.scheduledAt)}
                  disabled={!canProceed() || isSubmitting}
                  className="btn-secondary"
                >
                  🕐 {t('campaigns.schedule')}
                </button>
                <button
                  onClick={() => handleSubmit('immediate', null)}
                  disabled={!canProceed() || isSubmitting}
                  className="btn-primary px-6"
                >
                  {isSubmitting ? (
                    <span className="spinner w-4 h-4 inline-block" />
                  ) : (
                    <>🚀 {t('campaigns.sendNow')}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
