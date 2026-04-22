'use client';
import { useState, useEffect, useRef } from 'react';
import { notificationsApi, customersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import Tooltip from '@/components/ui/Tooltip';

interface Campaign {
  id: string; title: string; message: string; segment: string;
  status: string; sent_count: number; created_at: string;
  channel?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<{id: string; name: string; member_count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [campaignType, setCampaignType] = useState<'email' | 'wallet' | 'whatsapp'>('email');
  const [form, setForm] = useState({ title: '', message: '', segment_id: 'all', image_url: '' });
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);


  const load = () => {
    Promise.all([notificationsApi.campaigns(), customersApi.segments()])
      .then(([c, s]) => {
        setCampaigns(c.data.campaigns || []);
        const apiSegments = (s.data.segments || []).map((seg: { segment: string; count: number }) => ({
          id: seg.segment,
          name: seg.segment === 'vip' ? 'VIP' : seg.segment === 'active' ? 'Activos' : seg.segment === 'at_risk' ? 'En riesgo' : seg.segment === 'inactive' ? 'Inactivos' : seg.segment,
          member_count: seg.count,
        }));
        setSegments([{ id: 'all', name: 'Todos los clientes', member_count: s.data.total_customers || 0 }, ...apiSegments]);
      })
      .catch(() => toast.error('Error al cargar campañas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const token = Cookies.get('access_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/v1/upload/', {
        method: 'POST',
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, image_url: data.url || '' }));
        toast.success('Imagen cargada');
      }
    } catch { toast.error('Error al subir imagen'); }
    finally { setUploadingImg(false); }
  };

  const sendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error('Completa todos los campos'); return; }
    setSending(true);
    
    try {
      // Send to appropriate endpoint based on campaign type
      const payload = {
        ...form,
        channel: campaignType,
        title: form.title,
        message: form.message,
      };
      
      const resp = await notificationsApi.createCampaign(payload);
      
      const successMsg = campaignType === 'email' 
        ? '¡Campaña de email iniciada! Revisa tu bandeja de salida.'
        : '¡Notificación de wallet enviada! Los clientes recibirán actualizaciones en sus tarjetas.';
      
      toast.success(resp.data?.message || successMsg);
      setShowForm(false);
      setForm({ title: '', message: '', segment_id: 'all', image_url: '' });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar campaña';
      toast.error(msg);
    }
    finally { setSending(false); }
  };

  const STATUS_BADGE: Record<string, string> = {
    sent: 'badge-green', queued: 'badge-blue', draft: 'badge-gray', failed: 'badge-red', delivered: 'badge-green',
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campañas de Marketing</h1>
          <p className="text-surface-500 text-sm mt-1">Promociones y notificaciones a tus clientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" id="new-campaign-btn">
          {showForm ? 'Cancelar' : '+ Nueva campaña'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900">Canales de campaña disponibles:</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-indigo-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span><b>Email:</b> Correo electrónico masivo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span><b>Wallet:</b> Notificación en tarjetas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span><b>WhatsApp:</b> Mensaje directo (Mock)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span><b>Auto:</b> Recompensas y cumpleaños</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h2 className="text-base font-semibold mb-4">Nueva campaña de marketing</h2>
          
          {/* Campaign Type Selector */}
          <div className="mb-4">
            <label className="label">Tipo de campaña</label>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setCampaignType('email')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${campaignType === 'email' ? 'border-blue-500 bg-blue-50' : 'border-surface-200 hover:border-surface-300'}`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">Correo electrónico masivo</p>
              </button>
              
              <button
                type="button"
                onClick={() => setCampaignType('wallet')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${campaignType === 'wallet' ? 'border-purple-500 bg-purple-50' : 'border-surface-200 hover:border-surface-300'}`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="font-medium">Wallet</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">Notificación en tarjetas</p>
              </button>

              <button
                type="button"
                onClick={() => setCampaignType('whatsapp')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${campaignType === 'whatsapp' ? 'border-emerald-500 bg-emerald-50' : 'border-surface-200 hover:border-surface-300'}`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.24l-.31-.18-2.87.85.85-2.87-.2-.31A8 8 0 1112 20z"/>
                  </svg>
                  <span className="font-medium">WhatsApp</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">Mensaje directo (Mock)</p>
              </button>
            </div>
          </div>

          <form onSubmit={sendCampaign} className="space-y-4">
            <div>
              <label className="label" htmlFor="campaign-title">
                {campaignType === 'email' ? 'Asunto del email' : 'Título de la notificación'}
              </label>
              <input id="campaign-title" className="input" placeholder={campaignType === 'email' ? "¡Oferta especial para ti!" : "¡Felicidades! Has ganado puntos"}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            
            {/* Image Upload - Only for Email */}
            {campaignType === 'email' && (
              <div>
                <label className="label">Imagen de cabecera (opcional)</label>
                <div className="flex items-center gap-3 mt-1">
                  <button type="button" onClick={() => imgInputRef.current?.click()} 
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-400 flex items-center justify-center bg-surface-50">
                    {form.image_url ? (
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-xs text-surface-400">+</span>
                    )}
                  </button>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <div className="flex-1">
                    <p className="text-xs text-surface-500">{form.image_url ? 'Imagen cargada' : 'Sube una imagen para tu email'}</p>
                    {uploadingImg && <p className="text-xs text-brand-500">Subiendo...</p>}
                  </div>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-red-500 text-xs">Quitar</button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="campaign-msg">
                {campaignType === 'email' ? 'Contenido del email (HTML)' : 'Mensaje de notificación'}
              </label>
              {campaignType === 'email' ? (
                <>
                  <textarea id="campaign-msg"
                    className="input min-h-[120px] resize-none font-mono text-sm"
                    placeholder="<p>Hola!</p><p>Tenemos una oferta especial para ti...</p>"
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                  <p className="text-xs text-surface-400 mt-1">Puedes usar HTML: &lt;b&gt;, &lt;i&gt;, &lt;img&gt;</p>
                </>
              ) : (
                <textarea id="campaign-msg"
                  className="input min-h-[80px] resize-none"
                  placeholder="Tu clients recibirán una notificación en sus Wallet cards cuando haya un cambio en su programa (nuevo sello, puntos canjeados, etc)."
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="label mb-0">Segmento de destinatarios</label>
                <Tooltip text="Selecciona a qué grupo de clientes se enviará esta campaña. Los segmentos se calculan automáticamente basados en el comportamiento de tus clientes." />
              </div>
              {/* Segment Wizard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {segments.map(s => {
                  const segmentMeta: Record<string, { icon: string; desc: string; color: string; darkColor: string }> = {
                    all:      { icon: '📢', desc: 'Envía a toda tu base de clientes registrados.', color: 'border-brand-500 bg-brand-50', darkColor: 'dark:bg-brand-900/20' },
                    vip:      { icon: '👑', desc: 'Clientes con alto volumen de compras y visitas frecuentes.', color: 'border-amber-500 bg-amber-50', darkColor: 'dark:bg-amber-900/20' },
                    active:   { icon: '🟢', desc: 'Clientes con actividad reciente (últimos 30 días).', color: 'border-emerald-500 bg-emerald-50', darkColor: 'dark:bg-emerald-900/20' },
                    at_risk:  { icon: '⚠️', desc: 'Clientes cuya frecuencia de visita ha disminuido.', color: 'border-orange-500 bg-orange-50', darkColor: 'dark:bg-orange-900/20' },
                    inactive: { icon: '💤', desc: 'Clientes sin actividad en los últimos 60+ días.', color: 'border-red-400 bg-red-50', darkColor: 'dark:bg-red-900/20' },
                    new:      { icon: '🆕', desc: 'Clientes registrados en los últimos 30 días.', color: 'border-blue-500 bg-blue-50', darkColor: 'dark:bg-blue-900/20' },
                  };
                  const meta = segmentMeta[s.id] ?? { icon: '📊', desc: `Segmento: ${s.name}`, color: 'border-surface-300 bg-surface-50', darkColor: 'dark:bg-surface-800' };
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
                        <span className="text-xl">{meta.icon}</span>
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
                            {s.member_count.toLocaleString()} cliente{s.member_count !== 1 ? 's' : ''}
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
                  <span className="text-xs text-surface-500">📨 Esta campaña se enviará a</span>
                  <span className="text-xs font-bold text-surface-900 dark:text-white">
                    {segments.find(s => s.id === form.segment_id)?.member_count.toLocaleString() ?? 0} clientes
                  </span>
                  <span className="text-xs text-surface-500">del segmento</span>
                  <span className="badge-purple text-[10px]">
                    {segments.find(s => s.id === form.segment_id)?.name ?? form.segment_id}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1" id="cancel-campaign-btn">
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={sending} id="send-campaign-btn">
                {sending ? <span className="spinner w-4 h-4" /> : `Enviar campaña ${campaignType === 'email' ? '(Email)' : campaignType === 'wallet' ? '(Wallet)' : '(WhatsApp Mock)'}`}
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
          <p className="text-surface-700 font-semibold">No hay campañas enviadas</p>
          <p className="text-surface-400 text-sm mt-2">Crea tu primera campaña para promover tus ofertas</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Campaña</th><th>Tipo</th><th>Segmento</th><th>Estado</th><th>Enviados</th><th>Fecha</th></tr></thead>
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
                      c.channel === 'in_app' ? 'bg-purple-100 text-purple-700' :
                      c.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {c.channel === 'email' ? '📧 Email' : 
                       c.channel === 'in_app' ? '💳 Wallet' : 
                       c.channel === 'whatsapp' ? '💬 WhatsApp' :
                       c.channel?.toUpperCase() || 'Email'}
                    </span>
                  </td>
                  <td><span className="badge-blue">{c.segment}</span></td>
                  <td><span className={STATUS_BADGE[c.status] ?? 'badge-gray'}>{c.status}</span></td>
                  <td>{c.sent_count.toLocaleString()}</td>
                  <td className="text-xs text-surface-400">{new Date(c.created_at).toLocaleDateString('es-EC')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
