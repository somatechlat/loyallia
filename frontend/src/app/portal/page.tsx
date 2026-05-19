'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { QRCodeSVG } from 'qrcode.react';
import { portalApiClient } from '@/lib/portal-api';

interface PortalPass {
  pass_id: string;
  card_id: string;
  card_name: string;
  card_type: string;
  tenant_name: string;
  qr_code: string;
  is_active: boolean;
  enrolled_at: string;
  balance_display: string;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [passes, setPasses] = useState<PortalPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get('portal_token');
    if (!token) {
      router.replace('/portal/login');
      return;
    }
    loadPasses();
  }, [router]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const { data } = await portalApiClient.passes();
      setPasses(data.passes || []);
    } catch {
      toast.error('No se pudieron cargar tus tarjetas');
    } finally {
      setLoading(false);
    }
  };

  const handleDisenroll = async (passId: string, cardName: string) => {
    if (!confirm(`¿Salir del programa "${cardName}"? Ya no podrás usar esta tarjeta.`)) return;
    setDeletingId(passId);
    try {
      await portalApiClient.disenroll(passId);
      toast.success('Has salido del programa exitosamente.');
      setPasses((prev) => prev.filter((p) => p.pass_id !== passId));
    } catch {
      toast.error('No se pudo salir del programa');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    Cookies.remove('portal_token');
    router.replace('/portal/login');
  };

  const cardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stamp: 'Tarjeta de Sellos',
      cashback: 'Cashback',
      vip_membership: 'Membresía VIP',
      referral_pass: 'Referidos',
      coupon: 'Cupón',
      gift_certificate: 'Regalo',
      discount: 'Descuento',
      multipass: 'Multipase',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <div>
              <h1 className="font-bold text-surface-900 dark:text-white text-lg leading-tight">Portal de Cliente</h1>
              <p className="text-xs text-surface-500">Loyallia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/portal/privacy"
              className="text-sm text-surface-600 dark:text-surface-400 hover:text-brand-500 px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Privacidad
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-6">Mis Tarjetas</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="spinner w-8 h-8" />
          </div>
        ) : passes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700">
            <div className="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10l10 5 10-5" />
              </svg>
            </div>
            <p className="text-surface-500 text-sm">No tienes tarjetas de fidelización activas.</p>
            <p className="text-surface-400 text-xs mt-1">Escanea un QR de un negocio para inscribirte.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {passes.map((pass) => (
              <div
                key={pass.pass_id}
                className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 flex flex-col sm:flex-row gap-5"
              >
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="bg-white p-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <QRCodeSVG value={pass.qr_code} size={120} level="M" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-surface-900 dark:text-white">{pass.card_name}</h3>
                      <p className="text-xs text-surface-500 mt-0.5">{pass.tenant_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                      {cardTypeLabel(pass.card_type)}
                    </span>
                  </div>

                  {pass.balance_display && (
                    <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm font-semibold text-surface-700 dark:text-surface-300">
                      {pass.balance_display}
                    </div>
                  )}

                  <p className="text-[10px] text-surface-400 mt-3">
                    Inscrito el {new Date(pass.enrolled_at).toLocaleDateString('es-EC')}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDisenroll(pass.pass_id, pass.card_name)}
                      disabled={deletingId === pass.pass_id}
                      className="text-xs text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {deletingId === pass.pass_id ? 'Saliendo...' : 'Salir del programa'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
