'use client';
import { useState } from 'react';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

import {
  CardTypeIcon, CARD_TYPES, DESIGN_TEMPLATES, defaultMeta,
  APPLE_DEFAULT_FIELDS,
} from '@/components/programs/constants';
import { Palette } from '@/components/ui/LucideIcons';
import TypeConfig from '@/components/programs/TypeConfig';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import { BarcodeTypeSelector } from '@/components/programs/WalletCardPreview';
import WalletPreviewContent from '@/components/programs/WalletPreviewContent';
import WalletDesigner, {
  type WalletDesignState,
  defaultWalletDesignState,
} from '@/components/programs/WalletDesigner';
import FormBuilder, { type FormField } from '@/components/programs/FormBuilder';
import StepBar from '@/components/programs/new/StepBar';
import ProgramReviewStep from '@/components/programs/new/ProgramReviewStep';


/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function NewProgramPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [createdProgram, setCreatedProgram] = useState<{ id: string; name: string } | null>(null);
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
  const [walletDesign, setWalletDesign] = useState<WalletDesignState>(defaultWalletDesignState());
  const [selectedTemplate, setSelectedTemplate] = useState('midnight');

  // Keep generic uploads for backward compat (populated from wallet designer)
  const walletProvider = walletDesign.provider;
  const setWalletProvider = (v: 'apple' | 'google') => setWalletDesign(w => ({ ...w, provider: v }));
  const appleWalletConfig = walletDesign.appleNfc;

  const selectedType = CARD_TYPES.find(t => t.value === form.card_type);

  const handleTypeSelect = (type: string) => {
    setForm(f => ({ ...f, card_type: type }));
    setMeta(defaultMeta(type));
    // Reset wallet design defaults for the new card type
    const defaults = defaultWalletDesignState();
    defaults.provider = walletDesign.provider;
    // Pre-populate Apple default fields for this card type
    const typeDefaults = APPLE_DEFAULT_FIELDS[type];
    if (typeDefaults) {
      defaults.appleFields = JSON.parse(JSON.stringify(typeDefaults));
    }
    setWalletDesign(defaults);
  };

  const handleTemplateSelect = (template: typeof DESIGN_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    if (template.id !== 'custom') {
      setForm(f => ({ ...f, background_color: template.bg, text_color: template.text }));
    }
  };


  const canNext = () => {
    if (step === 0) return !!form.card_type;
    if (step === 1) return true;
    if (step === 2) return !!form.name;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const walletMetadata =
        walletDesign.provider === 'apple'
          ? {
              wallet_provider: 'apple',
              apple_wallet: walletDesign.appleNfc,
            }
          : {
              wallet_provider: 'google',
            };
      // Include wallet design configuration in metadata
      const walletDesignMetadata = {
        wallet_design: {
          provider: walletDesign.provider,
          apple_images: {
            logo: walletDesign.appleLogoUrl,
            logo_2x: walletDesign.appleLogo2xUrl,
            strip: walletDesign.appleStripUrl,
            strip_2x: walletDesign.appleStrip2xUrl,
            thumbnail: walletDesign.appleThumbnailUrl,
            thumbnail_2x: walletDesign.appleThumbnail2xUrl,
            icon: walletDesign.appleIconUrl,
            icon_2x: walletDesign.appleIcon2xUrl,
          },
          google_images: {
            program_logo: walletDesign.googleProgramLogoUrl,
            hero_image: walletDesign.googleHeroImageUrl,
            wide_logo: walletDesign.googleWideLogoUrl,
            image_module: walletDesign.googleImageModuleUrl,
          },
          apple_fields: walletDesign.appleFields,
          google_rows: walletDesign.googleRows,
          google_advanced: walletDesign.googleAdvanced,
          apple_advanced: walletDesign.appleAdvanced,
        },
      };
      // Map designer images to legacy fields for backward compat
      const legacyImages = {
        logo_url: walletDesign.provider === 'apple' ? walletDesign.appleLogoUrl : walletDesign.googleProgramLogoUrl,
        strip_image_url: walletDesign.provider === 'apple' ? walletDesign.appleStripUrl : walletDesign.googleHeroImageUrl,
        icon_url: walletDesign.provider === 'apple' ? walletDesign.appleIconUrl : walletDesign.googleProgramLogoUrl,
      };
      const resp = await programsApi.create({
        ...form,
        ...legacyImages,
        metadata: { ...meta, ...walletMetadata, ...walletDesignMetadata }
      });
      toast.success('¡Programa creado exitosamente!');
      setCreatedProgram({ id: resp.data.id, name: resp.data.name });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { message?: string; detail?: string; error?: string } } })?.response?.data;
      const msg = detail?.message || detail?.detail || detail?.error || 'Error al crear el programa';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {createdProgram ? (
        <div className="card p-8 text-center space-y-6 animate-fade-in max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">¡Programa creado!</h1>
            <p className="text-surface-500 mt-1">&quot;{createdProgram.name}&quot; está listo para recibir clientes.</p>
          </div>

          <div className="bg-surface-50 dark:bg-surface-900/50 rounded-xl p-6 border border-surface-200 dark:border-surface-700">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Código QR de inscripción</h3>
            <div className="flex justify-center mb-3">
              <img
                src={`https://quickchart.io/qr?text=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`)}&size=256&margin=2&dark=1a1a2e&light=ffffff&ecLevel=M&format=png`}
                alt="QR de inscripción"
                className="w-48 h-48 rounded-2xl border-2 border-surface-100 p-2 bg-white shadow-lg"
              />
            </div>
            <p className="text-xs text-surface-500 mb-3">
              Escanea este código o comparte el enlace para inscribir clientes.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('¡Enlace copiado!');
                }}
                className="btn-secondary text-sm"
              >
                Copiar enlace
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`¡Únete a nuestro programa de fidelización! ${typeof window !== 'undefined' ? window.location.origin : ''}/enroll/${createdProgram.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a href="/programs" className="btn-secondary text-sm">← Ver todos los programas</a>
            <a href={`/programs/${createdProgram.id}`} className="btn-primary text-sm">Ver programa →</a>
          </div>

          <div className="pt-2">
            <a
              href={`/programs/${createdProgram.id}/design`}
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
            >
              <Palette className="w-4 h-4" strokeWidth={1.5} />
              Personalizar diseño avanzado →
            </a>
          </div>
        </div>
      ) : (
        <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo Programa de Fidelización</h1>
          <p className="page-subtitle">Configura tu programa paso a paso</p>
        </div>
        <Link href="/programs" className="btn-ghost text-sm" id="back-to-programs">
          ← Volver a programas
        </Link>
      </div>

      <StepBar step={step} />

      {/* Step 0: card type selection */}
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Selecciona el tipo de programa</h2>
          <p className="text-sm text-surface-500">Puedes crear múltiples programas combinando diferentes tipos. <span className="text-brand-500">Pasa el mouse sobre cada tipo para ver una vista previa.</span></p>
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
            {/* Right: Hover Preview Panel (desktop only) */}
            <div className="hidden lg:flex items-start justify-center w-[220px] flex-shrink-0 sticky top-8" id="hover-preview-panel">
              <div className="bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-4 shadow-inner w-full">
                {hoveredType ? (
                  <div className="animate-fade-in flex justify-center">
                    <WalletPreviewContent type={hoveredType} walletDesign={walletDesign} />
                  </div>
                ) : (
                  <div className="w-full h-[370px] flex items-center justify-center text-center">
                    <p className="text-xs text-surface-500 dark:text-surface-400">👆 Pasa el mouse sobre un tipo de programa para ver una vista previa de la tarjeta</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: type-specific config */}
      {step === 1 && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7 text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Configurar: {selectedType?.label}</h2>
              <p className="text-xs text-surface-500">{selectedType?.desc}</p>
            </div>
          </div>
          <TypeConfig type={form.card_type} meta={meta} setMeta={setMeta} />

          {/* Form Builder — dynamic enrollment fields */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Name + Description */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Nombre y descripción</h2>
              <div>
                <label className="label" htmlFor="program-name">Nombre del programa</label>
                <input id="program-name" type="text" required className="input" placeholder="Ej: Café Frecuente"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="program-desc">Descripción</label>
                <textarea id="program-desc" className="input min-h-[80px] resize-none"
                  placeholder="Describe las reglas y beneficios..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {/* Geofences Manager */}
            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">Ubicaciones y Geocercas (Wallet GPS)</h2>
                  <p className="text-xs text-surface-500 mt-1">La tarjeta aparecerá en la pantalla de bloqueo cuando el cliente esté cerca de tu tienda (para NFC y Alertas).</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, locations: [...f.locations, {lat: 0, lng: 0, name: ''}]}))} className="btn-secondary text-xs shrink-0 self-start mt-1">
                  + Agregar
                </button>
              </div>
              
              <div className="space-y-3">
                {form.locations.map((loc, i) => (
                  <div key={i} className="flex gap-2 items-center bg-surface-50 p-2 rounded-lg border border-surface-200 dark:border-surface-700">
                    <input type="text" className="input flex-1 text-sm py-1" placeholder="Ej: Sucursal Centro" value={loc.name} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i]!.name = e.target.value;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lat (-0.18)" value={loc.lat || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i]!.lat = parseFloat(e.target.value) || 0;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lng (-78.48)" value={loc.lng || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i]!.lng = parseFloat(e.target.value) || 0;
                      setForm({...form, locations: newLocs});
                    }} />
                    <button type="button" className="text-red-400 hover:text-red-600 px-1" title="Eliminar" onClick={() => {
                      const newLocs = [...form.locations];
                      newLocs.splice(i, 1);
                      setForm({...form, locations: newLocs});
                    }}>✕</button>
                  </div>
                ))}
                {form.locations.length === 0 && (
                  <p className="text-xs text-brand-600 italic mt-2 bg-brand-50 p-3 rounded-lg border border-brand-100 flex items-center gap-2">
                    <span>i</span> Agrega la ubicacion de tu negocio para activar las alertas de Wallet de Apple/Google.
                  </p>
                )}
              </div>
            </div>

            {/* Wallet Designer — Full visual customization */}
            <WalletDesigner
              cardType={form.card_type}
              state={walletDesign}
              onChange={setWalletDesign}
              provider={walletProvider}
            />

            {/* Barcode Type Selector */}
            <BarcodeTypeSelector
              value={form.barcode_type}
              onChange={(v) => setForm(f => ({ ...f, barcode_type: v }))}
            />

            {/* Design Templates */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900 dark:text-white">Plantilla de diseño</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {DESIGN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                      ${selectedTemplate === t.id
                        ? 'border-brand-500 shadow-glow'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                      }`}
                    id={`template-${t.id}`}
                  >
                    {t.id === 'custom' ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 border border-white/50" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: t.bg }} />
                    )}
                    <span className="text-[9px] text-surface-600 font-medium">{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom colors — show if custom template selected */}
              {selectedTemplate === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-surface-100">
                  <div>
                    <label className="label text-xs">Color de fondo</label>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200 dark:border-surface-700"
                        value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.background_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Color de texto</label>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200 dark:border-surface-700"
                        value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.text_color}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Wallet Preview */}
          <div className="sticky top-24 self-start bg-gradient-to-b from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 rounded-2xl p-6 shadow-inner">
            <WalletCardPreview
              form={form}
              selectedType={selectedType}
              barcodeType={form.barcode_type}
              walletPlatform={walletProvider}
              onWalletPlatformChange={setWalletProvider}
              walletDesign={walletDesign}
            />
          </div>
        </div>
      )}

      {/* Step 3: review */}
      {step === 3 && (
        <ProgramReviewStep
          form={form}
          meta={meta}
          selectedType={selectedType}
          walletProvider={walletProvider}
          setWalletProvider={setWalletProvider}
          appleWalletConfig={appleWalletConfig}
          walletDesign={walletDesign}
        />
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          className={`btn-secondary ${step === 0 ? 'invisible' : ''}`}
          id="wizard-prev"
        >
          ← Anterior
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="btn-primary"
            disabled={!canNext()}
            id="wizard-next"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
            disabled={loading || !form.name}
            id="submit-program"
          >
            {loading ? <span className="spinner w-4 h-4" /> : 'Crear Programa'}
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
