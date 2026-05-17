'use client';

interface PlatformModeBannerProps {
  platformMode: 'development' | 'production';
  loadingMode: boolean;
  onToggle: () => void;
}

export default function PlatformModeBanner({ platformMode, loadingMode, onToggle }: PlatformModeBannerProps) {
  return (
    <div
      className={`rounded-2xl border p-5 space-y-3 ${
        platformMode === 'development'
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{platformMode === 'development' ? '🟡' : '🟢'}</span>
          <div>
            <p
              className={`text-sm font-bold uppercase ${
                platformMode === 'development' ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'
              }`}
            >
              {platformMode === 'development' ? 'MODO DESARROLLO' : 'MODO PRODUCCIÓN'}
            </p>
            <p
              className={`text-xs ${
                platformMode === 'development' ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'
              }`}
            >
              {platformMode === 'development'
                ? 'Twilio sandbox · Respaldos cada 15 días · Seguro para pruebas'
                : 'Twilio real · Respaldos diarios · Operaciones con costo real'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={loadingMode}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            platformMode === 'development'
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50`}
        >
          {loadingMode
            ? 'Cambiando...'
            : platformMode === 'development'
              ? 'Activar Modo Producción'
              : 'Activar Modo Desarrollo'}
        </button>
      </div>
    </div>
  );
}
