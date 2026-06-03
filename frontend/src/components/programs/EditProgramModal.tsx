'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { programsApi } from '@/lib/api';
import { uploadFile } from '@/lib/upload';
import { adjustColor } from '@/components/programs/constants';
import PremiumQrSvg from '@/components/programs/PremiumQrSvg';

/**
 * Data shape for a loyalty program card.
 */
export interface ProgramData {
  id: string;
  name: string;
  description: string;
  card_type: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  strip_image_url: string;
  icon_url: string;
  barcode_type: string;
  metadata: Record<string, unknown>;
}

const DESIGN_TEMPLATES = [
  { id: 'midnight',  name: 'Medianoche',    bg: '#1A1A2E', text: '#FFFFFF' },
  { id: 'ocean',     name: 'Océano',        bg: '#0F3460', text: '#FFFFFF' },
  { id: 'sunset',    name: 'Atardecer',     bg: '#FF6B35', text: '#FFFFFF' },
  { id: 'forest',    name: 'Bosque',        bg: '#0F766E', text: '#FFFFFF' },
  { id: 'royal',     name: 'Realeza',       bg: '#4C1D95', text: '#FFFFFF' },
  { id: 'rose',      name: 'Rosa',          bg: '#9F1239', text: '#FFFFFF' },
  { id: 'gold',      name: 'Dorado',        bg: '#78350F', text: '#F9D923' },
  { id: 'arctic',    name: 'Ártico',        bg: '#1E40AF', text: '#FFFFFF' },
  { id: 'slate',     name: 'Pizarra',       bg: '#334155', text: '#F8FAFC' },
  { id: 'emerald',   name: 'Esmeralda',     bg: '#065F46', text: '#FFFFFF' },
  { id: 'cherry',    name: 'Cereza',        bg: '#BE123C', text: '#FFFFFF' },
  { id: 'custom',    name: 'Personalizado', bg: '',        text: '' },
];

/**
 * @description Modal for editing a loyalty program's design and metadata.
 * @param {Object} props - Component props
 * @param {string} props.id - Program ID
 * @param {ProgramData} props.program - Current program data
 * @param {() => void} props.onClose - Close handler
 * @param {() => void} props.onSaved - Saved handler
 * @returns JSX.Element
 */
export default function EditProgramModal({ id, program, onClose, onSaved }: { id: string; program: ProgramData; onClose: () => void; onSaved: () => void }) {
  const [editForm, setEditForm] = useState({
    name: program.name || '',
    description: program.description || '',
    background_color: program.background_color || '#1a1a2e',
    text_color: program.text_color || '#ffffff',
    logo_url: program.logo_url || '',
    strip_image_url: program.strip_image_url || '',
    icon_url: program.icon_url || '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(program.logo_url || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [errors, setErrors] = useState({ name: false, desc: false, heroUrl: false, iconUrl: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadFile(file);
    if (url) {
      setEditForm(f => ({ ...f, logo_url: url }));
      setLogoPreview(url);
      toast.success('Logo subido');
    }
    setLogoUploading(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'strip_image_url' | 'icon_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      setEditForm(f => ({ ...f, [field]: url }));
      toast.success('Imagen subida');
    }
  };

  const handleEditSave = async () => {
    const errs = {
      name: !editForm.name.trim(),
      desc: editForm.description.length > 1000,
      heroUrl: !!editForm.strip_image_url && !/^https?:\/\/.+/.test(editForm.strip_image_url),
      iconUrl: !!editForm.icon_url && !/^https?:\/\/.+/.test(editForm.icon_url),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setEditSaving(true);
    try {
      await programsApi.update(id, editForm);
      toast.success('Programa actualizado y sincronizado con Google Wallet');
      onSaved();
    } catch { toast.error('Error al actualizar el programa'); }
    finally { setEditSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Soft frosted backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />

      {/* Clean glass container */}
      <div
        className="relative w-[96vw] h-[92vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >

        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200/60 bg-white/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Editar Programa</h2>
            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">{id.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
          >✕</button>
        </div>


        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">


          <div className="col-span-4 p-6 border-r border-slate-100 flex flex-col gap-4 bg-white/40">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Nombre del programa</label>
              <input
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-surface-900 border ${errors.name ? 'border-red-500' : 'border-slate-200'} text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm`}
                value={editForm.name}
                onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setErrors(err => ({ ...err, name: false })); }}
                placeholder="Ej: Café Frecuente"
                id="edit-name"
                maxLength={200}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">Nombre requerido</p>}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Descripción</label>
              <textarea
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-surface-900 border ${errors.desc ? 'border-red-500' : 'border-slate-200'} text-slate-800 placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm`}
                rows={2}
                value={editForm.description}
                onChange={e => { setEditForm(f => ({ ...f, description: e.target.value })); setErrors(err => ({ ...err, desc: false })); }}
                placeholder="Describe los beneficios de tu programa..."
                id="edit-desc"
                maxLength={1000}
              />
              {errors.desc && <p className="text-xs text-red-500 mt-1">Máximo 1000 caracteres</p>}
            </div>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 flex items-center justify-center transition-all bg-white dark:bg-surface-900 hover:bg-indigo-50 group overflow-hidden shrink-0 shadow-sm"
                id="edit-logo-btn"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 font-medium">{logoPreview ? 'Logo cargado ✓' : 'Logo del programa'}</p>
                <p className="text-[10px] text-slate-400">PNG, JPG, SVG • 256×256px</p>
                {logoUploading && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-[10px] text-indigo-500">Subiendo...</span>
                  </div>
                )}
              </div>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(null); setEditForm(f => ({ ...f, logo_url: '' })); }}
                  className="text-red-400 hover:text-red-600 text-xs transition-colors">✕</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

            {/* Hero image */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Imagen Hero / Banner</label>
              {editForm.strip_image_url && (
                <div className="relative mb-2 rounded-xl overflow-hidden h-16 bg-slate-50 border border-slate-100">
                  <img src={editForm.strip_image_url} alt="Hero" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, strip_image_url: '' }))}
                    className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className={`flex-1 px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border ${errors.heroUrl ? 'border-red-500' : 'border-slate-200'} text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm`}
                  placeholder="https://... URL de imagen"
                  type="url"
                  value={editForm.strip_image_url}
                  onChange={e => { setEditForm(f => ({ ...f, strip_image_url: e.target.value })); setErrors(err => ({ ...err, heroUrl: false })); }}
                  id="edit-hero-url"
                />
                <button type="button" onClick={() => heroFileRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs border border-slate-200 transition-all font-medium" id="upload-hero-btn">Subir</button>
              </div>
              {errors.heroUrl && <p className="text-xs text-red-500 mt-1">URL inválida</p>}
              <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'strip_image_url')} />
            </div>

            {/* Icon */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Ícono de recompensa</label>
              <div className="flex gap-2">
                <input
                  className={`flex-1 px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border ${errors.iconUrl ? 'border-red-500' : 'border-slate-200'} text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm`}
                  placeholder="https://... URL del ícono"
                  type="url"
                  value={editForm.icon_url}
                  onChange={e => { setEditForm(f => ({ ...f, icon_url: e.target.value })); setErrors(err => ({ ...err, iconUrl: false })); }}
                  id="edit-icon-url"
                />
                <button type="button" onClick={() => iconFileRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs border border-slate-200 transition-all font-medium" id="upload-icon-btn">Subir</button>
              </div>
              {errors.iconUrl && <p className="text-xs text-red-500 mt-1">URL inválida</p>}
              <input ref={iconFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'icon_url')} />
            </div>

            {editForm.icon_url && (
              <div className="flex items-center gap-2">
                <img src={editForm.icon_url} alt="Icon" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" onError={e => (e.currentTarget.style.display = 'none')} />
                <span className="text-[10px] text-slate-400">Ícono actual</span>
              </div>
            )}
          </div>


          <div className="col-span-3 p-6 border-r border-slate-100 flex flex-col gap-4 bg-white/30">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Plantillas de diseño</label>
              <div className="grid grid-cols-4 gap-1.5">
                {DESIGN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      if (t.id !== 'custom') setEditForm(f => ({ ...f, background_color: t.bg, text_color: t.text }));
                    }}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border transition-all
                      ${selectedTemplate === t.id
                        ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-surface-900 hover:bg-slate-50'}`}
                  >
                    {t.id === 'custom' ? (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400" />
                    ) : (
                      <div className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: t.bg }} />
                    )}
                    <span className="text-[8px] text-slate-500 font-medium leading-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color pickers */}
            <div className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {selectedTemplate === 'custom' ? 'Colores personalizados' : 'Colores del tema'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block font-medium">Fondo</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-7 rounded-lg cursor-pointer border border-slate-200"
                      value={editForm.background_color} onChange={e => setEditForm(f => ({ ...f, background_color: e.target.value }))} />
                    <span className="text-[10px] font-mono text-slate-400">{editForm.background_color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block font-medium">Texto</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-7 rounded-lg cursor-pointer border border-slate-200"
                      value={editForm.text_color} onChange={e => setEditForm(f => ({ ...f, text_color: e.target.value }))} />
                    <span className="text-[10px] font-mono text-slate-400">{editForm.text_color}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info tip */}
            <div className="mt-auto p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-[10px] text-indigo-600 font-medium mb-1">Consejo</p>
              <p className="text-[10px] text-indigo-500/70 leading-relaxed">
                Los cambios se sincronizan automáticamente con Google Wallet. Todos los clientes verán el nuevo diseño.
              </p>
            </div>
          </div>


          <div className="col-span-5 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-4">Vista previa en vivo</p>

            {/* Phone frame */}
            <div className="relative w-full max-w-[280px] mx-auto">
              <div className="relative bg-black rounded-[40px] p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] border-[3px] border-transparent bg-gradient-to-b from-gray-700 to-gray-800 bg-clip-padding ring-1 ring-white/20">
                {/* Side buttons */}
                <div className="absolute top-20 -left-[3px] w-[2px] h-7 bg-gray-600 rounded-l-sm" />
                <div className="absolute top-32 -left-[3px] w-[2px] h-12 bg-gray-600 rounded-l-sm" />
                <div className="absolute top-28 -right-[3px] w-[2px] h-14 bg-gray-600 rounded-r-sm" />
                <div className="bg-black rounded-[36px] overflow-hidden relative">
                  <div className="bg-black/80 px-4 py-2.5 flex justify-center">
                    <div className="w-14 h-1.5 bg-gray-800 rounded-full" />
                  </div>
                  <div className="px-3 pb-4 pt-1">
                    <div
                      className="rounded-2xl p-4 min-h-[230px] flex flex-col justify-between shadow-xl relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${editForm.background_color || '#1a1a2e'} 0%, ${adjustColor(editForm.background_color || '#1a1a2e', -25)} 50%, ${editForm.background_color || '#1a1a2e'} 100%)`,
                        color: editForm.text_color || '#ffffff',
                      }}
                    >
                      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${editForm.text_color || '#fff'} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />

                      {editForm.strip_image_url && (
                        <div className="relative z-10 -mx-4 -mt-4 mb-2">
                          <img src={editForm.strip_image_url} alt="Hero" className="w-full h-16 object-cover rounded-t-2xl" onError={e => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}

                      <div className="relative z-10 flex items-center gap-2.5 mb-3">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow">
                            <span className="font-bold text-base">{editForm.name?.[0] || 'P'}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[7px] font-bold uppercase tracking-widest opacity-50">Programa de Fidelidad</p>
                          <p className="text-sm font-bold leading-tight truncate drop-shadow">{editForm.name || 'Nombre del Programa'}</p>
                        </div>
                      </div>

                      <div className="relative z-10 mb-2">
                        <p className="text-[9px] opacity-60 line-clamp-2">{editForm.description || 'Descripción del programa'}</p>
                      </div>

                      <div className="relative z-10 flex items-end justify-between mt-auto">
                        <div>
                          <p className="text-[7px] uppercase tracking-wider opacity-40 font-semibold">Cliente</p>
                          <p className="text-xs font-bold opacity-90">Cliente</p>
                        </div>
                        <div className="bg-[#ffffff]/95 rounded-xl p-1 shadow-lg">
                          <PremiumQrSvg color={editForm.background_color || '#1a1a2e'} size={50} />
                        </div>
                      </div>


                    </div>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full" />
                </div>
              </div>
            </div>

            <p className="mt-4 text-[10px] text-slate-400 text-center">Apple Wallet / Google Wallet</p>

            {editForm.icon_url && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Ícono del pase</p>
                <img src={editForm.icon_url} alt="Icon" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>
        </div>


        <div className="flex items-center justify-between px-8 py-4 border-t border-slate-200/60 bg-white/60 shrink-0">
          <p className="text-[10px] text-slate-300 font-medium" />
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium border border-slate-200 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleEditSave}
              disabled={editSaving || !editForm.name}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
              id="save-edit-program"
            >
              {editSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : '✓ Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

