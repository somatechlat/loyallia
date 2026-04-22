'use client';
import { useState, useEffect } from 'react';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Subscription { plan: string; status: string; days_until_trial_end?: number; }
interface Usage { limits: Record<string, {used: number; limit: number; percentage: number}>; status: string; }

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([billingApi.subscription(), billingApi.usage()])
      .then(([s, u]) => { setSub(s.data); setUsage(u.data); })
      .catch(() => toast.error('Error al cargar facturación'))
      .finally(() => setLoading(false));
  }, []);

  const PLAN_LABELS: Record<string, string> = { trial: 'Prueba gratuita', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
  const STATUS_BADGE: Record<string, string> = { active: 'badge-green', trialing: 'badge-blue', past_due: 'badge-amber', canceled: 'badge-red' };

  return (
    <div className="space-y-6">
      <div className="page-header"><h1 className="page-title">Facturación</h1></div>

      {loading ? (
        <div className="h-48 bg-surface-200 rounded-2xl animate-pulse" />
      ) : (
        <>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-surface-900">{PLAN_LABELS[sub?.plan ?? ''] ?? sub?.plan}</h2>
                <span className={STATUS_BADGE[sub?.status ?? ''] ?? 'badge-gray'}>
                  {sub?.status}
                </span>
              </div>
              {sub?.days_until_trial_end !== undefined && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600">{sub.days_until_trial_end}</p>
                  <p className="text-xs text-surface-400">días restantes de prueba</p>
                </div>
              )}
            </div>
            <button className="btn-primary" id="upgrade-btn">Mejorar plan</button>
          </div>

          {usage && (
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4">Uso del plan</h2>
              <div className="space-y-4">
                {Object.entries(usage.limits).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-surface-600 capitalize">{key}</span>
                      <span className="font-medium">{val.used} / {val.limit}</span>
                    </div>
                    <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          val.percentage >= 90 ? 'bg-red-500' : val.percentage >= 75 ? 'bg-amber-400' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(val.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
