'use client';
import { useState } from 'react';
import { programsApi, walletTemplatesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { getQrUrl, getWhatsAppShareUrl } from '@/lib/constants';

import {
  CardTypeIcon, CARD_TYPES, defaultMeta,
} from '@/components/programs/constants';

import TypeConfig from '@/components/programs/TypeConfig';
import WalletPreviewContent from '@/components/programs/WalletPreviewContent';
import { WalletStudio } from '@/components/wallet/studio/WalletStudio';
import { DesignScore } from '@/components/wallet/studio/DesignScore';
import { useDesignScore } from '@/hooks/useDesignScore';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';
import { createDefaultState } from '@/hooks/useWalletStudio';
import { buildWalletDesignMetadata } from '@/components/wallet/serialization';
import FormBuilder, { type FormField } from '@/components/programs/FormBuilder';
import StepBar from '@/components/programs/new/StepBar';
import ProgramReviewStep from '@/components/programs/new/ProgramReviewStep';
import { programWizardStep0Schema, programWizardStep2Schema } from '@/lib/validations';
import type { ZodError } from 'zod';


export default function NewProgramPage() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
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
  const [coordError] = useState(false);
  const designScore = useDesignScore(walletDesign);

  // Derive preview platform from V2 state
  const walletProvider: 'apple' | 'google' = walletDesign.ui.platformView === 'google' ? 'google' : 'apple';
  const setWalletProvider = (v: 'apple' | 'google') => setWalletDesign(w => ({ ...w, ui: { ...w.ui, platformView: v as 'apple' | 'google' | 'both' } }));
  const appleWalletConfig = walletDesign.apple.nfc;

  const selectedType = CARD_TYPES.find(t => t.value === form.card_type);

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
    setLoading(true);
    try {
      const walletMetadata = buildWalletDesignMetadata(walletDesign);
      // Map designer images to legacy fields for backward compat
      const clean = (url: string) => url.startsWith('blob:') || url.startsWith('data:') ? '' : url;
      const isApple = walletProvider === 'apple';
      const legacyImages = {
        logo_url: clean(isApple ? (walletDesign.images.logo?.url ?? '') : (walletDesign.images.logo?.url ?? '')),
        strip_image_url: clean(isApple ? (walletDesign.images.strip?.url ?? '') : (walletDesign.images.heroImage?.url ?? '')),
        icon_url: clean(isApple ? (walletDesign.images.icon?.url ?? '') : (walletDesign.images.logo?.url ?? '')),
      };
      const resp = await programsApi.create({
        ...form,
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('programs.new.title')}</h1>
            <p className="page-subtitle">{t('programs.new.subtitle')}</p>
          </div>
          <Link href="/programs" className="btn-ghost text-sm" id="back-to-programs">
            {t('programs.new.backToPrograms')}
          </Link>
        </div>

        <StepBar step={step} />
      </div>

      {/* Step 0: card type selection */}
      {step === 0 && (
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.new.step0.title')}</h2>
          <p className="text-sm text-surface-500">{t('programs.new.step0.hint')} <span className="text-brand-500">{t('programs.new.step0.hoverHint')}</span></p>
          <div className="relative flex gap-6">
            {/* Left: Type Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {CARD_TYPES.map(ct => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => handleTypeSelect(ct.value)}
                  onMouseEnter={() => setHoveredType(ct.value)}
                  onMouseLeave={() => setHoveredType(null)}
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
                      <p className="font-semibold text-surface-900 dark:text-white text-sm">{ct.label}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{ct.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Right: Preview Panel (desktop only) */}
            <div className="hidden lg:flex items-start justify-center w-[220px] flex-shrink-0 sticky top-8" id="hover-preview-panel">
              <div className="bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-4 shadow-inner w-full">
                {hoveredType || form.card_type ? (
                  <div className="animate-fade-in flex justify-center">
                    <WalletPreviewContent type={hoveredType || form.card_type} walletDesign={walletDesign as any} />
                  </div>
                ) : (
                  <div className="w-full h-[370px] flex items-center justify-center text-center">
                    <p className="text-xs text-surface-500 dark:text-surface-400">{t('programs.new.step0.hoverPrompt')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: type-specific config */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7 text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.new.step1.title', { type: selectedType?.label ?? '' })}</h2>
              <p className="text-xs text-surface-500">{selectedType?.desc}</p>
            </div>
          </div>
          <TypeConfig type={form.card_type} meta={meta} setMeta={setMeta} />

          {/* Form Builder */}
          <div className="border-t border-surface-200 dark:border-surface-700 pt-5 mt-5">
            <FormBuilder
              fields={(meta.form_fields as FormField[]) || []}
              onChange={(fields) => setMeta(m => ({ ...m, form_fields: fields }))}
            />
          </div>
        </div>
      )}

      {/* Step 2: design, templates, logo upload, and preview */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          {/* Name + Description */}
          <div className="max-w-4xl mx-auto card p-6 space-y-4">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('programs.new.step2.nameDescTitle', { defaultValue: 'Nombre y descripción' })}</h2>
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
              <textarea
                id="program-desc"
                className={`input min-h-[80px] resize-none ${validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
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

          {/* Geofences Manager */}
          <div className="max-w-4xl mx-auto card p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-base font-bold text-surface-900 dark:text-white">{t('programs.new.step2.locationsTitle')}</h2>
                <p className="text-xs text-surface-500 mt-1">{t('programs.new.step2.locationsHint')}</p>
              </div>
              <button type="button" onClick={() => setForm(f => ({...f, locations: [...f.locations, {lat: 0, lng: 0, name: ''}]}))} className="btn-secondary text-xs shrink-0 self-start mt-1">
                + {t('programs.new.step2.addLocation')}
              </button>
            </div>

            {/* Location validation errors summary */}
            {Object.keys(validationErrors).some(k => k.startsWith('locations')) && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{t('programs.new.step2.locationErrors')}</p>
                {Object.entries(validationErrors).filter(([k]) => k.startsWith('locations')).map(([k, msg]) => (
                  <p key={k} className="text-xs text-red-600 dark:text-red-400">{msg}</p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {form.locations.map((loc, i) => (
                <div key={i} className="flex gap-2 items-center bg-surface-50 p-2 rounded-lg border border-surface-200 dark:border-surface-700">
                  <input type="text" className="input flex-1 text-sm py-1" placeholder={t('programs.new.step2.locationNamePlaceholder')} value={loc.name} onChange={e => {
                    const newLocs = [...form.locations];
                    newLocs[i]!.name = e.target.value;
                    setForm({...form, locations: newLocs});
                  }} />
                  <input type="number" step="any" min={-90} max={90} className="input w-24 text-sm py-1" placeholder={t('programs.new.step2.locationLatPlaceholder')} value={loc.lat || ''} onChange={e => {
                    const newLocs = [...form.locations];
                    const v = parseFloat(e.target.value);
                    newLocs[i]!.lat = isNaN(v) ? 0 : Math.max(-90, Math.min(90, v));
                    setForm({...form, locations: newLocs});
                  }} />
                  <input type="number" step="any" min={-180} max={180} className="input w-24 text-sm py-1" placeholder={t('programs.new.step2.locationLngPlaceholder')} value={loc.lng || ''} onChange={e => {
                    const newLocs = [...form.locations];
                    const v = parseFloat(e.target.value);
                    newLocs[i]!.lng = isNaN(v) ? 0 : Math.max(-180, Math.min(180, v));
                    setForm({...form, locations: newLocs});
                  }} />
                  <button type="button" className="text-red-400 hover:text-red-600 px-1" title={t('programs.new.step2.deleteLocation')} onClick={() => {
                    const newLocs = [...form.locations];
                    newLocs.splice(i, 1);
                    setForm({...form, locations: newLocs});
                  }}>✕</button>
                </div>
              ))}
              {coordError && <p className="text-xs text-red-500 mt-2">{t('programs.new.step2.coordError')}</p>}
              {form.locations.length === 0 && (
                <p className="text-xs text-brand-600 italic mt-2 bg-brand-50 p-3 rounded-lg border border-brand-100 flex items-center gap-2">
                  <span>i</span> {t('programs.new.step2.locationHint')}
                </p>
              )}
            </div>
          </div>

          {/* Wallet Designer — FULL WIDTH, FULL HEIGHT */}
          <div className="px-0 lg:px-2">
            <div className="rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 shadow-lg" style={{ height: 'calc(100vh - 140px)', minHeight: 800 }}>
              <WalletStudio
                initialState={walletDesign}
                onSave={(state) => setWalletDesign(state)}
                onSaveAsTemplate={async (s) => {
                  try {
                    await walletTemplatesApi.create({
                      name: s.name || 'Plantilla sin nombre',
                      description: '',
                      card_type: s.cardType,
                      industry: s.industry,
                      design_state: s as unknown as Record<string, unknown>,
                      include_back_content: true,
                      tags: [],
                    });
                    toast.success(t('wallet.studio.saveTemplateSuccess') || 'Plantilla guardada correctamente');
                  } catch (err: any) {
                    const msg = err?.response?.data?.detail || err?.message || 'Error al guardar plantilla';
                    toast.error(msg);
                  }
                }}
              />
            </div>
          </div>

          {/* Design Score — below preview area */}
          <div className="max-w-4xl mx-auto">
            <DesignScore result={designScore} />
          </div>
        </div>
      )}

      {/* Step 3: review */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto animate-fade-in">
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

      {/* Navigation buttons */}
      <div className="max-w-4xl mx-auto flex justify-between pt-4">
        <button
          type="button"
          onClick={() => {
            setValidationErrors({});
            setStep(s => Math.max(0, s - 1));
          }}
          className={`btn-secondary ${step === 0 ? 'invisible' : ''}`}
          id="wizard-prev"
        >
          {t('programs.new.nav.prev')}
        </button>

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
            className="btn-primary"
            disabled={!canNext()}
            id="wizard-next"
          >
            {t('programs.new.nav.next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
            disabled={loading || !form.name}
            id="submit-program"
          >
            {loading ? <span className="spinner w-4 h-4" /> : t('programs.new.nav.create')}
          </button>
        )}
      </div>
    </div>
  );
}
