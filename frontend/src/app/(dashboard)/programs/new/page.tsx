'use client';
import { useState } from 'react';
import { programsApi, walletTemplatesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { getQrUrl, getWhatsAppShareUrl } from '@/lib/constants';

import {
  CardTypeIcon, CARD_TYPES, CARD_TYPE_LABEL_KEYS, defaultMeta,
} from '@/components/programs/constants';

import TypeConfig from '@/components/programs/TypeConfig';
import WalletPreviewContent, { type PreviewWalletDesign } from '@/components/programs/WalletPreviewContent';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { createDefaultState } from '@/hooks/useWalletStudio';
import { buildWalletDesignMetadata } from '@/components/wallet/serialization';
import FormBuilder, { type FormField } from '@/components/programs/FormBuilder';
import StepBar from '@/components/programs/new/StepBar';
import ProgramReviewStep from '@/components/programs/new/ProgramReviewStep';
import { programWizardStep0Schema, programWizardStep2Schema } from '@/lib/validations';
import type { ZodError } from 'zod';

/** Convert a WalletPassStudioState into the flat preview shape WalletPreviewContent expects. */
function toPreviewDesign(state: WalletPassStudioState): PreviewWalletDesign {
  return {
    provider: state.ui.platformView === 'google' ? 'google' : 'apple',
    appleLogoUrl: state.images.logo?.url,
    appleStripUrl: state.images.strip?.url,
    googleProgramLogoUrl: state.images.logo?.url,
    googleHeroImageUrl: state.images.strip?.url,
    colors: {
      background: state.colors.background,
      foreground: state.colors.foreground,
    },
  };
}


export default function NewProgramPage() {
  const { t } = useI18n();
  const STEPS_COUNT = 4;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdProgram, setCreatedProgram] = useState<{ id: string; name: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    card_type: '',
    description: '',
    background_color: '#1a1a2e',
    text_color: '#ffffff',
    logo_url: '',
    strip_image_url: '',
    icon_url: '',
    barcode_type: 'qr_code',
    locations: [] as Array<{lat: number, lng: number, name: string}>,
  });
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [walletDesign, setWalletDesign] = useState<WalletPassStudioState>(createDefaultState());

  // Derive preview platform from V2 state
  const walletProvider: 'apple' | 'google' = walletDesign.ui.platformView === 'google' ? 'google' : 'apple';
  const setWalletProvider = (v: 'apple' | 'google') => setWalletDesign(w => ({ ...w, ui: { ...w.ui, platformView: v as 'apple' | 'google' | 'both' } }));
  const appleWalletConfig = walletDesign.apple.nfc;

  const selectedType = CARD_TYPES.find(ct => ct.value === form.card_type);

  const handleTypeSelect = (type: string) => {
    setForm(f => ({ ...f, card_type: type }));
    setMeta(defaultMeta(type));
    // Reset wallet design defaults for the new card type
    const defaults = createDefaultState();
    defaults.cardType = type as WalletPassStudioState['cardType'];
    defaults.ui.platformView = walletDesign.ui.platformView;
    setWalletDesign(defaults);
  };

  const validateStep = (targetStep: number): boolean => {
    setValidationErrors({});
    try {
      if (targetStep === 0) {
        programWizardStep0Schema.parse({ card_type: form.card_type });
      } else if (targetStep === 2) {
        programWizardStep2Schema.parse(form);
      }
      return true;
    } catch (err) {
      const zodErr = err as ZodError;
      const fieldErrors: Record<string, string> = {};
      zodErr.errors.forEach((e) => {
        const path = e.path.join('.');
        fieldErrors[path] = e.message;
      });
      setValidationErrors(fieldErrors);
      return false;
    }
  };

  const canNext = () => {
    if (step === 0) {
      const result = programWizardStep0Schema.safeParse({ card_type: form.card_type });
      return result.success;
    }
    if (step === 1) return true;
    if (step === 2) {
      const result = programWizardStep2Schema.safeParse(form);
      return result.success;
    }
    return true;
  };

  const handleSubmit = async () => {
    // Validate required images for wallet passes
    const hasLogo = !!(walletDesign.images.logo?.url && !walletDesign.images.logo.url.startsWith('blob:'));
    if (!hasLogo) {
      toast.error(t('programs.new.toast.logoRequired') || 'Logo image is required for Apple Wallet and Google Wallet. Please upload a logo in the Images tab.');
      return;
    }

    setLoading(true);
    try {
      const walletMetadata = buildWalletDesignMetadata(walletDesign);
      // Map designer images to legacy fields for backward compat
      // Only strip blob:/data: URLs that were never uploaded to storage.
      // Permanent URLs (/assets/..., https://...) are preserved as-is.
      const clean = (url: string) => url.startsWith('blob:') || url.startsWith('data:') ? '' : url;
      // Use images.strip for both platforms (heroImage is a legacy alias)
      const stripUrl = walletDesign.images.strip?.url || walletDesign.images.heroImage?.url || '';
      const legacyImages = {
        logo_url: clean(walletDesign.images.logo?.url ?? ''),
        strip_image_url: clean(stripUrl),
        icon_url: clean(walletDesign.images.icon?.url ?? ''),
      };
      // Prepend card type label to program name
      const typeLabel = t(CARD_TYPE_LABEL_KEYS[form.card_type]?.labelKey ?? 'programs.cardTypes.stamp');
      const displayName = t('programs.new.namePattern', { type: typeLabel, name: form.name });
      const resp = await programsApi.create({
        ...form,
        name: displayName,
        ...legacyImages,
        metadata: { ...meta, ...walletMetadata }
      });
      toast.success(t('programs.new.toast.created'));
      setCreatedProgram({ id: resp.data.id, name: resp.data.name });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } };
      const detail = axiosErr?.response?.data?.detail;
      let msg: string;
      if (Array.isArray(detail)) {
        msg = detail.map((d: Record<string, unknown>) => `${(d.loc as string[])?.join('.')}: ${d.msg}`).join('; ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else {
        msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || t('programs.new.toast.createError');
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Success view
  if (createdProgram) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card p-8 text-center space-y-6 animate-fade-in max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('programs.new.created.title')}</h1>
            <p className="text-surface-500 mt-1">{t('programs.new.created.subtitle', { name: createdProgram.name })}</p>
          </div>

          <div className="bg-surface-50 dark:bg-surface-900/50 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('programs.new.created.qrTitle')}</h3>
            <div className="flex justify-center mb-3">
              <img
                src={getQrUrl(`${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`, 256)}
                alt={t('programs.new.created.qrAlt')}
                className="w-48 h-48 rounded-2xl border-2 border-surface-100 p-2 bg-white shadow-lg"
              />
            </div>
            <p className="text-xs text-surface-500 mb-3">
              {t('programs.new.created.qrHint')}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success(t('programs.new.created.copySuccess'));
                }}
                className="btn-secondary text-sm"
              >
                {t('programs.new.created.copyLink')}
              </button>
              <a
                href={getWhatsAppShareUrl(`${t('programs.new.created.whatsappShareText', { name: createdProgram.name })} ${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {t('programs.new.created.whatsapp')}
              </a>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a href="/programs" className="btn-secondary text-sm">{t('programs.new.created.viewAll')}</a>
            <a href={`/programs/${createdProgram.id}`} className="btn-primary text-sm">{t('programs.new.created.viewProgram')}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + StepBar */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('programs.new.title')}</h1>
            <p className="page-subtitle">{t('programs.new.subtitle')}</p>
          </div>
          <Link href="/programs" className="btn-ghost text-sm" id="back-to-programs">
            {t('programs.new.backToPrograms')}
          </Link>
        </div>

        <StepBar step={step} onStepClick={(s) => { setValidationErrors({}); setStep(s); }} />
      </div>

      {/* Step 0: card type selection */}
      {step === 0 && (
        <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.new.step0.title')}</h2>
          <p className="text-sm text-surface-500">{t('programs.new.step0.hint')}</p>
          <div className="relative flex gap-6">
            {/* Left: Type Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {CARD_TYPES.map(ct => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => handleTypeSelect(ct.value)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all duration-200
                    ${form.card_type === ct.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-glow'
                      : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600 hover:shadow-card'
                    }`}
                  id={`card-type-${ct.value}`}
                >
                  <div className="flex items-start gap-3">
                    <CardTypeIcon icon={ct.icon} className="w-6 h-6 text-surface-600 dark:text-surface-400" />
                    <div>
                      <p className="font-semibold text-surface-900 dark:text-white text-sm">{t(CARD_TYPE_LABEL_KEYS[ct.value]?.labelKey ?? '')}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{t(CARD_TYPE_LABEL_KEYS[ct.value]?.descKey ?? '')}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Right: Preview Panel — always visible, shows selected card */}
            <div className="hidden lg:flex flex-col items-center justify-start w-[300px] flex-shrink-0 sticky top-8 gap-3" id="preview-panel">
              {/* Platform toggle */}
              <div className="flex w-full rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden bg-surface-50 dark:bg-surface-800">
                <button type="button" onClick={() => setWalletProvider('apple')} className={`flex-1 py-2 text-xs font-semibold transition-all duration-200 ${walletProvider === 'apple' ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                  Apple Wallet
                </button>
                <button type="button" onClick={() => setWalletProvider('google')} className={`flex-1 py-2 text-xs font-semibold transition-all duration-200 ${walletProvider === 'google' ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                  Google Wallet
                </button>
              </div>
              {/* Card preview — always visible */}
              <div className="bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-4 shadow-inner w-full flex justify-center">
                <WalletPreviewContent type={form.card_type || 'stamp'} walletDesign={toPreviewDesign(walletDesign)} />
              </div>
              <p className="text-[10px] text-surface-400 text-center">{t(CARD_TYPE_LABEL_KEYS[form.card_type]?.labelKey ?? '')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: type-specific config — two-column with live preview */}
      {step === 1 && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Left: Config form */}
            <div className="space-y-5">
              {/* Card type hero banner */}
              <div className="card p-5 flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900/30">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                  <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.new.step1.title', { type: t(CARD_TYPE_LABEL_KEYS[form.card_type]?.labelKey ?? '') })}</h2>
                  <p className="text-xs text-surface-500">{t(CARD_TYPE_LABEL_KEYS[form.card_type]?.descKey ?? '')}</p>
                </div>
              </div>

              {/* Card type config */}
              <div className="card p-6 space-y-4">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  {t('programs.new.step1.configTitle', { defaultValue: 'Card Rules' })}
                </h3>
                <TypeConfig type={form.card_type} meta={meta} setMeta={setMeta} />
              </div>

              {/* Form Builder */}
              <div className="card p-6 space-y-4">
                <FormBuilder
                  fields={(meta.form_fields as FormField[]) || []}
                  onChange={(fields) => setMeta(m => ({ ...m, form_fields: fields }))}
                />
              </div>
            </div>

            {/* Right: Live preview (sticky) */}
            <div className="hidden lg:block sticky top-8 self-start">
              <div className="card p-4 space-y-3">
                <h3 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider text-center">{t('programs.new.step1.livePreview', { defaultValue: 'Live Preview' })}</h3>
                <div className="bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-xl p-4 flex justify-center">
                  <WalletPreviewContent type={form.card_type || 'stamp'} walletDesign={toPreviewDesign(walletDesign)} />
                </div>
                <div className="flex justify-center">
                  <span className="text-[10px] text-surface-400">{t(CARD_TYPE_LABEL_KEYS[form.card_type]?.labelKey ?? '')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: design, templates, logo upload, and preview */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          {/* Collapsible: Name + Description + Locations */}
          <details className="max-w-6xl mx-auto card overflow-hidden" open>
            <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors select-none">
              <svg className="w-4 h-4 text-surface-400 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              <h2 className="text-sm font-bold text-surface-900 dark:text-white">{t('programs.new.step2.nameDescTitle')}</h2>
              {form.name && <span className="text-xs text-surface-400 truncate ml-2">— {form.name}</span>}
            </summary>
            <div className="px-5 pb-5 space-y-4 border-t border-surface-100 dark:border-surface-800 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="program-name">{t('programs.new.step2.nameLabel')}</label>
                  <input
                    id="program-name"
                    type="text"
                    required
                    maxLength={200}
                    className={`input ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder={t('programs.new.step2.namePlaceholder')}
                    value={form.name}
                    onChange={e => {
                      setValidationErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                      setForm(f => ({ ...f, name: e.target.value }));
                    }}
                    aria-invalid={!!validationErrors.name}
                  />
                  {validationErrors.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.name}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="program-desc">{t('programs.new.step2.descLabel')}</label>
                  <input
                    id="program-desc"
                    type="text"
                    className={`input ${validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    maxLength={1000}
                    placeholder={t('programs.new.step2.descPlaceholder')}
                    value={form.description}
                    onChange={e => {
                      setValidationErrors(prev => { const n = { ...prev }; delete n.description; return n; });
                      setForm(f => ({ ...f, description: e.target.value }));
                    }}
                    aria-invalid={!!validationErrors.description}
                  />
                  {validationErrors.description && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.description}</p>}
                </div>
              </div>

              {/* Locations inline */}
              <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-surface-700 dark:text-surface-300">{t('programs.new.step2.locationsTitle')}</h3>
                    <p className="text-[10px] text-surface-400">{t('programs.new.step2.locationsHint')}</p>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({...f, locations: [...f.locations, {lat: 0, lng: 0, name: ''}]}))} className="btn-secondary text-xs px-2.5 py-1">
                    + {t('programs.new.step2.addLocation')}
                  </button>
                </div>
                {form.locations.map((loc, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2 bg-surface-50 dark:bg-surface-800/50 p-2 rounded-lg border border-surface-200 dark:border-surface-700">
                    <input type="text" className="input flex-1 text-sm py-1" placeholder={t('programs.new.step2.locationNamePlaceholder')} value={loc.name} onChange={e => {
                      const newLocs = [...form.locations]; newLocs[i]!.name = e.target.value; setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" min={-90} max={90} className="input w-24 text-sm py-1" placeholder={t('programs.new.step2.locationLatPlaceholder')} value={loc.lat || ''} onChange={e => {
                      const newLocs = [...form.locations]; const v = parseFloat(e.target.value); newLocs[i]!.lat = isNaN(v) ? 0 : Math.max(-90, Math.min(90, v)); setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" min={-180} max={180} className="input w-24 text-sm py-1" placeholder={t('programs.new.step2.locationLngPlaceholder')} value={loc.lng || ''} onChange={e => {
                      const newLocs = [...form.locations]; const v = parseFloat(e.target.value); newLocs[i]!.lng = isNaN(v) ? 0 : Math.max(-180, Math.min(180, v)); setForm({...form, locations: newLocs});
                    }} />
                    <button type="button" className="text-red-400 hover:text-red-600 px-1" title={t('programs.new.step2.deleteLocation')} onClick={() => {
                      const newLocs = [...form.locations]; newLocs.splice(i, 1); setForm({...form, locations: newLocs});
                    }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Wallet Designer — FULL WIDTH, FULL HEIGHT */}
          <div className="px-0 lg:px-2">
            <div className="rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 shadow-lg" style={{ height: 'calc(100vh - 200px)', minHeight: 600 }}>
              <WalletStudio
                initialState={walletDesign}
                externalName={form.name}
                externalDescription={form.description}
                onChange={(state) => setWalletDesign(state)}
                onSave={(state) => setWalletDesign(state)}
                onSaveAsTemplate={async (s) => {
                  try {
                    await walletTemplatesApi.create({
                      name: s.name || t('wallet.studio.untitledTemplate'),
                      description: '',
                      card_type: s.cardType,
                      industry: s.industry,
                      design_state: s as unknown as Record<string, unknown>,
                      include_back_content: true,
                      tags: [],
                    });
                    toast.success(t('wallet.studio.saveTemplateSuccess'));
                  } catch (err: unknown) {
                    const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
                    const msg = axiosErr?.response?.data?.detail || (err instanceof Error ? err.message : null) || t('wallet.studio.saveTemplateError');
                    toast.error(msg);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: review */}
      {step === 3 && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <ProgramReviewStep
            form={form}
            meta={meta}
            selectedType={selectedType}
            walletProvider={walletProvider}
            setWalletProvider={setWalletProvider}
            appleWalletConfig={appleWalletConfig}
            walletDesign={walletDesign}
          />
        </div>
      )}

      {/* Sticky bottom navigation */}
      <div className="sticky bottom-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-t border-surface-200 dark:border-surface-700 -mx-6 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setValidationErrors({});
              setStep(s => Math.max(0, s - 1));
            }}
            className={`btn-secondary flex items-center gap-2 ${step === 0 ? 'invisible' : ''}`}
            id="wizard-prev"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            {t('programs.new.nav.prev')}
          </button>

          {/* Step indicator */}
          <span className="text-xs text-surface-400 hidden sm:block">
            {step + 1} / {STEPS_COUNT}
          </span>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (!validateStep(step)) {
                  toast.error(t('programs.new.nav.validationError'));
                  return;
                }
                setStep(s => s + 1);
              }}
              className="btn-primary flex items-center gap-2"
              disabled={!canNext()}
              id="wizard-next"
            >
              {t('programs.new.nav.next')}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary flex items-center gap-2"
              disabled={loading || !form.name}
              id="submit-program"
            >
              {loading ? <span className="spinner w-4 h-4" /> : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {t('programs.new.nav.create')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
