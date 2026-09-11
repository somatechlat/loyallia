'use client';
import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });

interface PlatformMetrics {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_locations: number;
  total_customers: number;
  mrr: number;
  recent_tenants: Array<{ id: string; name: string; city?: string; plan: string; is_active: boolean }>;
}

interface LocationPin {
  id: string; name: string; lat: number; lng: number; city?: string; address?: string; is_active?: boolean;
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  detail?: string;
}

function checkHealth(url: string, name: string): Promise<HealthCheck> {
  const start = Date.now();
  return fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) })
    .then(r => ({ name, status: r.ok ? 'ok' as const : 'degraded' as const, latencyMs: Date.now() - start }))
    .catch(() => ({ name, status: 'down' as const, latencyMs: Date.now() - start }));
}

export default function SuperAdminDashboard() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [health, setHealth] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      api.get('/api/v1/admin/platform/metrics/'),
      api.get('/api/v1/admin/platform/locations/'),
    ]).then(([m, locs]) => {
      setMetrics(m.data);
      setLocations(locs.data || []);
    }).catch(() => {
      toast.error(t('superadmin.dashboard.loadError'));
    }).finally(() => setLoading(false));
  }, [t]);

  const loadHealth = useCallback(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    Promise.all([
      checkHealth(`${base}/api/v1/health/`, 'API'),
    ]).then(checks => setHealth(checks));
  }, []);

  useEffect(() => {
    loadData();
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, [loadData, loadHealth]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: t('superadmin.dashboard.kpi.registeredBusinesses'), value: metrics?.total_tenants || 0, color: 'brand' },
    { label: t('superadmin.dashboard.kpi.activeBusinesses'), value: metrics?.active_tenants || 0, color: 'green' },
    { label: t('superadmin.dashboard.kpi.inTrial'), value: metrics?.trial_tenants || 0, color: 'yellow' },
    { label: t('superadmin.dashboard.kpi.suspended'), value: metrics?.suspended_tenants || 0, color: 'red' },
    { label: t('superadmin.dashboard.kpi.totalUsers'), value: metrics?.total_users || 0, color: 'blue' },
    { label: t('superadmin.dashboard.kpi.locations'), value: metrics?.total_locations || 0, color: 'purple' },
    { label: t('superadmin.dashboard.kpi.endCustomers'), value: metrics?.total_customers || 0, color: 'emerald' },
    { label: t('superadmin.dashboard.kpi.mrr'), value: `$${(metrics?.mrr || 0).toFixed(0)}`, color: 'indigo' },
  ];

  const colorClasses: Record<string, string> = {
    brand: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600',
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-surface-900 dark:text-white tracking-tight">{t('superadmin.dashboard.title')}</h1>
        <p className="text-surface-500 text-sm mt-0.5">{t('superadmin.dashboard.subtitle')}</p>
      </header>

      {/* Health Bar */}
      <div className="flex gap-3 flex-wrap">
        {health.map(h => (
          <div key={h.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs">
            <span className={`w-2 h-2 rounded-full ${h.status === 'ok' ? 'bg-green-500' : h.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className="font-medium text-surface-700 dark:text-surface-300">{h.name}</span>
            {h.latencyMs !== undefined && <span className="text-surface-400 font-mono">{h.latencyMs}ms</span>}
          </div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow">
            <div className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${colorClasses[color]}`}>
              {label}
            </div>
            <p className="text-3xl font-black text-surface-900 dark:text-white mt-2">{value}</p>
          </div>
        ))}
      </div>

      {/* Map + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-surface-700">
            <h2 className="font-bold text-surface-900 dark:text-white text-sm">{t('superadmin.dashboard.mapTitle')}</h2>
            <p className="text-xs text-surface-400">{t('superadmin.dashboard.locationsCount', { count: locations.length })}</p>
          </div>
          <div className="h-[400px]">
            <LocationMap locations={locations} />
          </div>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm">
          <div className="p-4 border-b border-surface-100 dark:border-surface-700">
            <h2 className="font-bold text-surface-900 dark:text-white text-sm">{t('superadmin.dashboard.recentActivity')}</h2>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-surface-800 max-h-[400px] overflow-y-auto">
            {(metrics?.recent_tenants || []).map(tenant => (
              <div key={tenant.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${tenant.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{tenant.name}</p>
                  <p className="text-xs text-surface-400">{tenant.city || '—'} · {tenant.plan.toUpperCase()}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  tenant.plan === 'full' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600'
                }`}>{tenant.plan}</span>
              </div>
            ))}
            {(!metrics?.recent_tenants || metrics.recent_tenants.length === 0) && (
              <p className="px-4 py-8 text-sm text-surface-400 text-center">{t('common.noResults')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
