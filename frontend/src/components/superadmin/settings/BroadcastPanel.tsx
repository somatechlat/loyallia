'use client';

interface BroadcastPanelProps {
  subject: string;
  message: string;
  sending: boolean;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function BroadcastPanel({
  subject,
  message,
  sending,
  onSubjectChange,
  onMessageChange,
  onSubmit,
}: BroadcastPanelProps) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3 mb-4">Anuncio Global (Broadcast)</h2>
      <p className="text-sm text-surface-500 mb-4">Envía un email a todos los propietarios de negocios registrados en la plataforma.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Asunto</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Mantenimiento programado..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Mensaje</label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Escribe el mensaje aquí..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
        >
          {sending ? 'Enviando...' : 'Enviar a todos los propietarios'}
        </button>
      </form>
    </div>
  );
}
