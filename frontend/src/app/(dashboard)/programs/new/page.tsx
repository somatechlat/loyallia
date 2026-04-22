'use client';
import { useState, useRef } from 'react';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Tooltip from '@/components/ui/Tooltip';
import { CardTypeIcon, CARD_TYPES, DESIGN_TEMPLATES, BARCODE_TYPES, defaultMeta } from '@/components/programs/constants';
import TypeConfig from '@/components/programs/TypeConfig';
import WalletCardPreview from '@/components/programs/WalletCardPreview';
import { BarcodeTypeSelector } from '@/components/programs/WalletCardPreview';
import WalletPreviewContent from '@/components/programs/WalletPreviewContent';
import FormBuilder, { type FormField } from '@/components/programs/FormBuilder';


/** Upload file to /api/v1/upload/ with JWT auth */
async function uploadFileAuth(file: File): Promise<string | null> {
  const token = Cookies.get('access_token');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/v1/upload/', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data.url || null;
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Step indicator ──────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  const steps = ['Tipo', 'Configuración', 'Diseño', 'Revisión'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            transition-all duration-300
            ${i < step ? 'bg-brand-500 text-white' :
              i === step ? 'bg-brand-500 text-white shadow-glow' :
              'bg-surface-100 text-surface-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-semibold hidden sm:block
            ${i <= step ? 'text-surface-900' : 'text-surface-400'}`}>{label}</span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all duration-300 mx-1
              ${i < step ? 'bg-brand-500' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}


/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function NewProgramPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
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
  const [selectedTemplate, setSelectedTemplate] = useState('midnight');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = CARD_TYPES.find(t => t.value === form.card_type);

  const handleTypeSelect = (type: string) => {
    setForm(f => ({ ...f, card_type: type }));
    setMeta(defaultMeta(type));
  };

  const handleTemplateSelect = (template: typeof DESIGN_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    if (template.id !== 'custom') {
      setForm(f => ({ ...f, background_color: template.bg, text_color: template.text }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend with JWT auth
    setLogoUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, logo_url: url }));
      toast.success('Logo subido correctamente');
    } else {
      toast('Logo guardado localmente', { icon: 'ℹ️' });
    }
    setLogoUploading(false);
  };

  const [stripPreview, setStripPreview] = useState<string | null>(null);
  const [stripUploading, setStripUploading] = useState(false);
  const stripInputRef = useRef<HTMLInputElement>(null);

  const handleStripUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setStripPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setStripUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, strip_image_url: url }));
      toast.success('Imagen de cabecera subida');
    } else {
      toast('Guardada localmente', { icon: 'ℹ️' });
    }
    setStripUploading(false);
  };

  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIconUploading(true);
    const url = await uploadFileAuth(file);
    if (url) {
      setForm(f => ({ ...f, icon_url: url }));
      toast.success('Ícono subido');
    } else {
      toast('Guardado localmente', { icon: 'ℹ️' });
    }
    setIconUploading(false);
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
      await programsApi.create({ ...form, metadata: meta });
      toast.success('¡Programa creado exitosamente!');
      window.location.href = '/programs';
    } catch {
      toast.error('Error al crear el programa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* ──── STEP 0: Card type selection ──── */}
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
              {hoveredType ? (
                <div className="animate-fade-in">
                  <WalletPreviewContent type={hoveredType} />
                </div>
              ) : (
                <div className="w-full h-[370px] flex items-center justify-center text-center">
                  <p className="text-xs text-surface-400">👆 Pasa el mouse sobre un tipo de programa para ver una vista previa de la tarjeta</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──── STEP 1: Type-specific config ──── */}
      {step === 1 && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-7 h-7 text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-surface-900">Configurar: {selectedType?.label}</h2>
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

      {/* ──── STEP 2: Design — Templates + Logo Upload + Preview ──── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Name + Description */}
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-bold text-surface-900">Nombre y descripción</h2>
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
                  <h2 className="text-base font-bold text-surface-900">Ubicaciones y Geocercas (Wallet GPS)</h2>
                  <p className="text-xs text-surface-500 mt-1">La tarjeta aparecerá en la pantalla de bloqueo cuando el cliente esté cerca de tu tienda (para NFC y Alertas).</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, locations: [...f.locations, {lat: 0, lng: 0, name: ''}]}))} className="btn-secondary text-xs shrink-0 self-start mt-1">
                  + Agregar
                </button>
              </div>
              
              <div className="space-y-3">
                {form.locations.map((loc, i) => (
                  <div key={i} className="flex gap-2 items-center bg-surface-50 p-2 rounded-lg border border-surface-200">
                    <input type="text" className="input flex-1 text-sm py-1" placeholder="Ej: Sucursal Centro" value={loc.name} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].name = e.target.value;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lat (-0.18)" value={loc.lat || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].lat = parseFloat(e.target.value) || 0;
                      setForm({...form, locations: newLocs});
                    }} />
                    <input type="number" step="any" className="input w-24 text-sm py-1" placeholder="Lng (-78.48)" value={loc.lng || ''} onChange={e => {
                      const newLocs = [...form.locations];
                      newLocs[i].lng = parseFloat(e.target.value) || 0;
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

            {/* Logo Upload */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Logo del programa</h2>
              <p className="text-sm text-surface-500">Sube el logo de tu negocio. Aparecerá en la tarjeta del cliente.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group"
                  id="logo-upload-btn"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <p className="text-[10px] text-surface-400 group-hover:text-brand-500 mt-1">Subir</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {logoPreview ? 'Logo cargado ✓' : 'Sin logo'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG o SVG. Recomendado: 256×256px
                  </p>
                  {logoUploading && (
                    <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      Subiendo...
                    </p>
                  )}
                </div>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => { setLogoPreview(null); setForm(f => ({ ...f, logo_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-file-input"
              />
            </div>

            {/* Strip Image Upload - Hero Image for Wallet */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Imagen de cabecera (Hero)</h2>
              <p className="text-sm text-surface-500">Imagen grande que aparece en la parte superior de la tarjeta del wallet.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => stripInputRef.current?.click()}
                  className="w-32 h-20 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group overflow-hidden"
                  id="strip-upload-btn"
                >
                  {stripPreview ? (
                    <img src={stripPreview} alt="Strip" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/></svg>
                      <p className="text-[9px] text-surface-400 group-hover:text-brand-500 mt-1">Hero</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {stripPreview ? 'Imagen de cabecera cargada ✓' : 'Sin imagen de cabecera'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG. Recomendado: 600×200px (aspect ratio 3:1)
                  </p>
                </div>
                {stripPreview && (
                  <button
                    type="button"
                    onClick={() => { setStripPreview(null); setForm(f => ({ ...f, strip_image_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={stripInputRef}
                type="file"
                accept="image/*"
                onChange={handleStripUpload}
                className="hidden"
                id="strip-file-input"
              />
            </div>

            {/* Icon Upload */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Ícono del programa</h2>
              <p className="text-sm text-surface-500">Ícono pequeño para mostrar en la tarjeta.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center transition-all bg-surface-50 hover:bg-brand-50 group overflow-hidden"
                  id="icon-upload-btn"
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-5 h-5 mx-auto text-surface-400 group-hover:text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
                      <p className="text-[8px] text-surface-400 group-hover:text-brand-500 mt-1">Icono</p>
                    </div>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-surface-700 font-medium">
                    {iconPreview ? 'Ícono cargado ✓' : 'Sin ícono'}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PNG, JPG. Recomendado: 64×64px
                  </p>
                </div>
                {iconPreview && (
                  <button
                    type="button"
                    onClick={() => { setIconPreview(null); setForm(f => ({ ...f, icon_url: '' })); }}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={handleIconUpload}
                className="hidden"
                id="icon-file-input"
              />
            </div>

            {/* Barcode Type Selector */}
            <BarcodeTypeSelector
              value={form.barcode_type}
              onChange={(v) => setForm(f => ({ ...f, barcode_type: v }))}
            />

            {/* Design Templates */}
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-surface-900">Plantilla de diseño</h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {DESIGN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                      ${selectedTemplate === t.id
                        ? 'border-brand-500 shadow-glow'
                        : 'border-surface-200 hover:border-surface-300'
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
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                        value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.background_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Color de texto</label>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-10 h-8 rounded-lg cursor-pointer border border-surface-200"
                        value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} />
                      <span className="text-xs font-mono text-surface-500">{form.text_color}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Wallet Preview */}
          <div className="sticky top-24">
            <WalletCardPreview form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={form.barcode_type} />
          </div>
        </div>
      )}

      {/* ──── STEP 3: Review ──── */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-6 space-y-5">
            <h2 className="text-lg font-bold text-surface-900">Revisa tu programa</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Tipo</span>
                <span className="text-sm font-semibold"><CardTypeIcon icon={selectedType?.icon || 'stamp'} className="w-4 h-4 inline-block mr-1" /> {selectedType?.label}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Nombre</span>
                <span className="text-sm font-semibold">{form.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-500">Código</span>
                <span className="text-sm font-semibold">{BARCODE_TYPES.find(b => b.value === form.barcode_type)?.label || 'QR Code'}</span>
              </div>
              {form.description && (
                <div className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-sm text-surface-500">Descripción</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{form.description}</span>
                </div>
              )}
              {Object.entries(meta).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-sm text-surface-500">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>

            {/* Wallet features info */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-brand-800">Funcionalidades de Wallet incluidas:</p>
              <ul className="text-brand-700 text-xs space-y-1 ml-4 list-disc">
                <li>Tarjeta digital en Apple Wallet y Google Pay</li>
                <li>Código QR único por cliente</li>
                <li>Notificaciones push por geolocalización</li>
                <li>Actualización en tiempo real</li>
              </ul>
            </div>
          </div>

          {/* Preview */}
          <div>
            <WalletCardPreview form={form} selectedType={selectedType} logoPreview={logoPreview} stripPreview={stripPreview} barcodeType={form.barcode_type} />
          </div>
        </div>
      )}

      {/* ──── Navigation buttons ──── */}
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
    </div>
  );
}
