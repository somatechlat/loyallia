'use client';
import { useState, useEffect } from 'react';
import { automationApi, programsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Automation {
  id: string; name: string; description: string; trigger: string;
  action: string; is_active: boolean; total_executions: number;
  last_executed: string | null; trigger_config: Record<string, unknown>; action_config: Record<string, unknown>;
  cooldown_hours: number; max_executions_per_day: number | null;
}

interface ProgramOption { id: string; name: string; card_type: string; }

const TRIGGER_LABELS: Record<string, string> = {
  customer_enrolled: 'Cliente inscrito', transaction_completed: 'Transacción completada',
  reward_earned: 'Recompensa ganada', reward_ready: 'Recompensa lista',
  birthday_coming: 'Cumpleaños próximo', inactive_reminder: 'Recordatorio de inactividad',
  milestone_reached: 'Hito alcanzado', scheduled_time: 'Hora programada',
};

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  customer_enrolled: 'Se ejecuta cuando un cliente se inscribe por primera vez.',
  transaction_completed: 'Se ejecuta cada vez que un cliente completa una transacción (sello, puntos, etc).',
  reward_earned: 'Se ejecuta cuando un cliente gana una recompensa.',
  reward_ready: 'Se ejecuta cuando la recompensa está lista para canjear.',
  birthday_coming: 'Se ejecuta X días antes del cumpleaños del cliente.',
  inactive_reminder: 'Se ejecuta si el cliente no visita en X días.',
  milestone_reached: 'Se ejecuta cuando el cliente alcanza un hito (N visitas, N puntos).',
  scheduled_time: 'Se ejecuta a una hora / día programado.',
};

// Preset automation templates
const PRESET_TEMPLATES = [
  {
    id: 'welcome',
    name: '🎉 Bienvenida a nuevos clientes',
    description: 'Envia un mensaje de bienvenida cuando alguien seinscribe',
    trigger: 'customer_enrolled',
    action: 'send_email',
    action_config: { title: '¡Bienvenido a nuestro programa!', message: 'Gracias por unirte. Ahora puedes ganar recompensas con cada visita.' },
  },
  {
    id: 'birthday',
    name: '🎂 Felicidades de cumpleaños',
    description: 'Envia una promoción especial en el cumpleaños del cliente',
    trigger: 'birthday_coming',
    action: 'send_email',
    action_config: { title: '🎂 ¡Feliz cumpleaños!', message: '¡Tenemos un regalo especial para ti! Visita nuestro local y muestra este mensaje.' },
  },
  {
    id: 'inactive',
    name: '💤 Recordatorio de inactividad',
    description: 'Recuerda a los clientes que no han visitado en mucho tiempo',
    trigger: 'inactive_reminder',
    action: 'send_email',
    action_config: { title: '¡Te extrañamos!', message: 'Ha pasado un tiempo desde tu última visita. Tenemos una oferta especial esperándote.' },
  },
  {
    id: 'milestone',
    name: '🏆 Cliente fiel - Hitos',
    description: 'Celebra cuando el cliente alcanza un número de visitas/puntos',
    trigger: 'milestone_reached',
    action: 'send_email',
    action_config: { title: '¡Felicidades! Has alcanzado un hito', message: 'Gracias por ser un cliente fiel. Has ganado una recompensa especial.' },
  },
  {
    id: 'reward_ready',
    name: '🎁 Recompensa lista para canjear',
    description: 'Notifica cuando el cliente tiene una recompensa lista',
    trigger: 'reward_ready',
    action: 'send_email',
    action_config: { title: '¡Tu recompensa está lista!', message: 'Ya puedes canjear tu recompensa. Visita nuestro local y muestra tu código.' },
  },
  {
    id: 'transaction',
    name: '💳 Confirmación de transacción',
    description: 'Confirma cada transacción con Sellos/Puntos',
    trigger: 'transaction_completed',
    action: 'send_email',
    action_config: { title: 'Transacción registrada', message: '¡Has ganado sellos/puntos! Sigue acumulando para obtener tu próxima recompensa.' },
  },
];

const ACTION_LABELS: Record<string, string> = {
  send_notification: 'Notificación (Push/Email)', send_email: 'Solo Email',
  send_sms: 'Enviar SMS', issue_reward: 'Emitir recompensa',
  update_segment: 'Actualizar segmento', create_campaign: 'Crear campaña',
  send_wallet: '💳 Notificación Wallet',
};
/* Flat SVG icons for actions — NO emojis */
const ACTION_ICON_PATHS: Record<string, string> = {
  send_notification: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  send_email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
  send_sms: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  issue_reward: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  update_segment: 'M18 20V10M12 20V4M6 20v-6',
  create_campaign: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
};
function ActionIcon({ action, className = 'w-5 h-5' }: { action: string; className?: string }) {
  const d = ACTION_ICON_PATHS[action] || ACTION_ICON_PATHS.send_notification;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const EMPTY_FORM = {
  name: '', description: '', trigger: 'customer_enrolled', action: 'send_notification',
  trigger_config: {} as Record<string, string>, action_config: { title: '', message: '' } as Record<string, string>,
  cooldown_hours: 24, max_executions_per_day: null as number | null,
};

export default function AutomationPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [stats, setStats] = useState<{total_executions: number; success_rate: number} | null>(null);
  const [loading, setLoading] = useState(true);

  /* Modal state */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [showDelete, setShowDelete] = useState<string | null>(null);

  const load = () => {
    Promise.all([automationApi.list(), automationApi.stats()])
      .then(([list, s]) => { setAutomations(Array.isArray(list.data) ? list.data : list.data.items || []); setStats(s.data); })
      .catch(() => toast.error('Error al cargar automatizaciones'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    programsApi.list().then(res => {
      const items = Array.isArray(res.data) ? res.data : res.data.items || [];
      setPrograms(items.map((p: { id: string; name: string; card_type: string }) => ({ id: p.id, name: p.name, card_type: p.card_type })));
    }).catch(() => {});
  }, []);

  const toggle = async (id: string, name: string) => {
    try { await automationApi.toggle(id); toast.success(`"${name}" actualizada`); load(); }
    catch { toast.error('Error al actualizar'); }
  };

  const openCreate = (preset?: typeof PRESET_TEMPLATES[0]) => {
    setEditingId(null);
    if (preset) {
      setForm({
        name: preset.name,
        description: preset.description,
        trigger: preset.trigger,
        action: preset.action,
        trigger_config: {},
        action_config: preset.action_config,
        cooldown_hours: 24,
        max_executions_per_day: null,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setStep(1);
    setShowModal(true);
  };

  const openEdit = (a: Automation) => {
    setEditingId(a.id);
    setForm({
      name: a.name, description: a.description, trigger: a.trigger, action: a.action,
      trigger_config: (a.trigger_config || {}) as Record<string, string>,
      action_config: (a.action_config || { title: '', message: '' }) as Record<string, string>,
      cooldown_hours: a.cooldown_hours || 24, max_executions_per_day: a.max_executions_per_day,
    });
    setStep(1);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ingresa un nombre'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await automationApi.update(editingId, form);
        toast.success('Automatización actualizada');
      } else {
        await automationApi.create(form);
        toast.success('Automatización creada');
      }
      setShowModal(false);
      load();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await automationApi.delete(id); toast.success('Automatización eliminada'); load(); }
    catch { toast.error('Error al eliminar'); }
    finally { setShowDelete(null); }
  };

  const totalSteps = 3;

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Automatizaciones</h1>
          <p className="text-surface-500 text-sm mt-1">Reglas automáticas de engagement con clientes</p>
        </div>
        {isOwner && (
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2" id="create-automation-btn">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nueva automatización
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <p className="stat-label">Total ejecuciones</p>
            <p className="stat-value text-brand-600">{stats.total_executions.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Tasa de éxito</p>
            <p className="stat-value text-emerald-600">{stats.success_rate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Preset Templates - Quick Start */}
      {isOwner && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-surface-900 mb-4">⚡ Inicio rápido - Plantillas predefinidas</h2>
          <p className="text-sm text-surface-500 mb-4">Crea automatizaciones en un clic usando estas plantillas:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_TEMPLATES.map(preset => (
              <button
                key={preset.id}
                onClick={() => openCreate(preset)}
                className="text-left p-4 rounded-xl border-2 border-surface-200 hover:border-brand-400 hover:bg-brand-50 transition-all group"
              >
                <p className="font-semibold text-surface-900 group-hover:text-brand-700">{preset.name}</p>
                <p className="text-xs text-surface-500 mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-brand-50 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <p className="text-surface-700 font-semibold text-lg">No hay automatizaciones configuradas</p>
          <p className="text-surface-400 text-sm mt-2 max-w-sm mx-auto">
            Las automatizaciones envían mensajes y recompensas automáticamente basándose en el comportamiento de tus clientes.
          </p>
          {isOwner && (
            <button onClick={() => openCreate()} className="btn-primary mt-6" id="create-first-automation">
              Crear primera automatización
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <div key={a.id} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${a.is_active ? 'bg-brand-50' : 'bg-surface-100'}`}>
                <ActionIcon action={a.action} className="w-5 h-5 text-brand-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-surface-900 truncate">{a.name}</h3>
                  <span className={a.is_active ? 'badge-green' : 'badge-gray'}>
                    {a.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-surface-500">
                  {TRIGGER_LABELS[a.trigger] ?? a.trigger} → {ACTION_LABELS[a.action] ?? a.action}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  {a.total_executions} ejecuciones
                  {a.last_executed ? ` · Última: ${new Date(a.last_executed).toLocaleDateString('es-EC')}` : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button onClick={() => openEdit(a)} className="btn-ghost text-sm p-2" title="Editar">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
                <button
                  onClick={() => toggle(a.id, a.name)}
                  className={`btn text-sm ${a.is_active ? 'btn-secondary' : 'btn-primary'}`}
                  id={`toggle-automation-${a.id}`}>
                  {a.is_active ? 'Desactivar' : 'Activar'}
                </button>
                {isOwner && (
                  <button onClick={() => setShowDelete(a.id)} className="btn-ghost text-red-400 hover:text-red-600 text-sm p-2" title="Eliminar">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Delete Confirmation ═══ */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">¿Eliminar automatización?</h3>
            <p className="text-surface-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(null)} className="btn-ghost flex-1 text-sm">Cancelar</button>
              <button onClick={() => handleDelete(showDelete)} className="btn-danger flex-1 text-sm" id="confirm-delete-automation">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Create / Edit Modal ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-surface-900">
                  {editingId ? 'Editar automatización' : 'Nueva automatización'}
                </h2>
                <p className="text-xs text-surface-400 mt-0.5">Paso {step} de {totalSteps}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step indicators */}
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-brand-500' : 'bg-surface-200'}`} />
                ))}
              </div>

              {/* STEP 1: Name + Description */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="label" htmlFor="auto-name">Nombre de la automatización</label>
                    <input id="auto-name" className="input" placeholder="Ej: Bienvenida a nuevos clientes"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="auto-desc">Descripción (opcional)</label>
                    <textarea id="auto-desc" className="input min-h-[80px] resize-none"
                      placeholder="¿Qué hace esta automatización?"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* STEP 2: Trigger + Action */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="label">Disparador — ¿Cuándo se activa?</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                        <button key={key} type="button"
                          onClick={() => setForm(f => ({ ...f, trigger: key }))}
                          className={`text-left p-3 rounded-xl border-2 transition-all text-sm
                            ${form.trigger === key ? 'border-brand-500 bg-brand-50 shadow-glow' : 'border-surface-200 hover:border-surface-300'}`}>
                          <p className="font-medium text-surface-900">{label}</p>
                          <p className="text-[10px] text-surface-400 mt-0.5">{TRIGGER_DESCRIPTIONS[key]?.slice(0, 60)}...</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Acción — ¿Qué se ejecuta?</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {Object.entries(ACTION_LABELS).map(([key, label]) => (
                        <button key={key} type="button"
                          onClick={() => setForm(f => ({ ...f, action: key }))}
                          className={`text-left p-3 rounded-xl border-2 transition-all text-sm
                            ${form.action === key ? 'border-brand-500 bg-brand-50 shadow-glow' : 'border-surface-200 hover:border-surface-300'}`}>
                          <ActionIcon action={key} className="w-4 h-4 text-surface-600 inline-block" />
                          <span className="font-medium text-surface-900">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Config + Cooldown */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Action config: notification title/message */}
                  {(form.action === 'send_notification' || form.action === 'send_email') && (
                    <>
                      <div>
                        <label className="label" htmlFor="action-title">Título del mensaje</label>
                        <input id="action-title" className="input" placeholder="Ej: ¡Bienvenido a nuestro programa!"
                          value={form.action_config.title || ''}
                          onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, title: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="label" htmlFor="action-message">Contenido del mensaje</label>
                        <textarea id="action-message" className="input min-h-[80px] resize-none"
                          placeholder="Ej: Gracias por unirte. Tu primera recompensa te espera."
                          value={form.action_config.message || ''}
                          onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, message: e.target.value } }))} />
                      </div>
                    </>
                  )}

                  {/* Action config: issue_reward */}
                  {form.action === 'issue_reward' && programs.length > 0 && (
                    <div>
                      <label className="label" htmlFor="reward-program">Programa objetivo</label>
                      <select id="reward-program" className="input"
                        value={form.action_config.program_id || ''}
                        onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, program_id: e.target.value } }))}>
                        <option value="">Seleccionar programa</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Cooldown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="cooldown">Enfriamiento (horas)</label>
                      <input id="cooldown" type="number" className="input" min={1}
                        value={form.cooldown_hours}
                        onChange={e => setForm(f => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))} />
                      <p className="text-[10px] text-surface-400 mt-1">Horas mínimas entre ejecuciones por cliente</p>
                    </div>
                    <div>
                      <label className="label" htmlFor="max-exec">Máx ejecuciones/día</label>
                      <input id="max-exec" type="number" className="input" min={0}
                        value={form.max_executions_per_day ?? ''}
                        onChange={e => setForm(f => ({ ...f, max_executions_per_day: e.target.value ? parseInt(e.target.value) : null }))} />
                      <p className="text-[10px] text-surface-400 mt-1">Dejar vacío = sin límite</p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 mt-4">
                    <p className="text-sm font-semibold text-brand-900 mb-1">Resumen</p>
                    <p className="text-xs text-brand-700">
                      Cuando <strong>{TRIGGER_LABELS[form.trigger]}</strong> →{' '}
                      <strong>{ACTION_LABELS[form.action]}</strong>
                      {form.action_config.title ? ` → "${form.action_config.title}"` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-surface-100 flex gap-3 justify-between">
              <button onClick={() => step > 1 ? setStep(step - 1) : setShowModal(false)}
                className="btn-ghost text-sm">
                {step > 1 ? '← Anterior' : 'Cancelar'}
              </button>
              {step < totalSteps ? (
                <button onClick={() => {
                  if (step === 1 && !form.name.trim()) { toast.error('Ingresa un nombre'); return; }
                  setStep(step + 1);
                }} className="btn-primary text-sm">
                  Siguiente →
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm" id="save-automation-btn">
                  {saving ? <span className="spinner w-4 h-4" /> : (editingId ? 'Guardar cambios' : 'Crear automatización')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
