'use client';

/**
 * LYL-M-FE-034: Offline detection and user notification.
 * Shows a persistent banner when the browser goes offline.
 */
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <span className="mr-2">📡</span>
      Sin conexión a internet — Los cambios se guardarán cuando vuelvas a conectarte.
    </div>
  );
}
