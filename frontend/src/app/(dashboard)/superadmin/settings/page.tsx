'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type Integration = {
  key: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  status: string;
  detail: string;
};

export default function SuperAdminSettings() {
  const [broadcastForm, setBroadcastForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    api.get('/api/v1/admin/platform/integrations/')
      .then(({ data }) => setIntegrations(data))
      .catch(() => setIntegrations([]));
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const toastId = toast.loading('Enviando a todos los propietarios...');
    try {
      const { data } = await api.post('/api/v1/admin/broadcast/', broadcastForm);
      toast.success(data.message || 'Enviado', { id: toastId });
      setBroadcastForm({ subject: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar';
      toast.error(msg, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Configuración Global</h1>
        <p className="text-surface-500 mt-1">Ajustes de la plataforma Loyallia</p>
      </header>

      {/* Platform Settings */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Parámetros del Sistema</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Días de prueba por defecto</label>
            <input type="number" className="input" defaultValue={5} disabled />
            <p className="text-xs text-surface-400 mt-1">Configurado en settings.py (TRIAL_DAYS)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Precio base mensual (USD)</label>
            <input type="text" className="input" defaultValue="$75.00" disabled />
            <p className="text-xs text-surface-400 mt-1">Configurado en settings.py (PLAN_FULL_PRICE_USD)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Tasa IVA Ecuador</label>
            <input type="text" className="input" defaultValue="15%" disabled />
            <p className="text-xs text-surface-400 mt-1">TAX_RATE_ECUADOR = 0.15</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Zona Horaria</label>
            <input type="text" className="input" defaultValue="America/Guayaquil" disabled />
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Integraciones</h2>
        <div className="grid grid-cols-2 gap-4">
          {integrations.map(int => (
            <div key={int.name} className="flex items-center gap-3 p-3 rounded-xl border border-surface-100">
              <span className={`w-3 h-3 rounded-full ${int.enabled && int.configured ? 'bg-green-500' : int.enabled ? 'bg-yellow-500' : 'bg-surface-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{int.name}</p>
                <p className="text-xs text-surface-400">{int.detail}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${int.enabled && int.configured ? 'bg-green-100 text-green-700' : int.enabled ? 'bg-yellow-100 text-yellow-700' : 'bg-surface-100 text-surface-600'}`}>
                {int.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3 mb-4">Anuncio Global (Broadcast)</h2>
        <p className="text-sm text-surface-500 mb-4">Envía un email a todos los propietarios de negocios registrados en la plataforma.</p>
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Asunto</label>
            <input required className="input" placeholder="Mantenimiento programado..." value={broadcastForm.subject}
              onChange={e => setBroadcastForm({...broadcastForm, subject: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Mensaje</label>
            <textarea required className="input" rows={4} placeholder="Detalle del anuncio..." value={broadcastForm.message}
              onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} />
          </div>
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar a todos los propietarios'}
          </button>
        </form>
      </div>
    </div>
  );
}
