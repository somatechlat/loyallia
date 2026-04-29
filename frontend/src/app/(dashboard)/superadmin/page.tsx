'use client';
import { useEffect, useState } from 'react';

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
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

// Leaflet map loaded dynamically (SSR-incompatible)
const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });

export default function SuperAdminDashboard() {
  const { user: _user } = useAuth();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/admin/platform/metrics/'),
      api.get('/api/v1/admin/platform/locations/'),
    ]).then(([m, locs]) => {
      setMetrics(m.data);
      setLocations(locs.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-surface-200 rounded-3xl" />
      </div>
    );
  }

  const kpis = [
    { label: 'Negocios Registrados', value: metrics?.total_tenants || 0, color: 'brand', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Negocios Activos', value: metrics?.active_tenants || 0, color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'En Prueba', value: metrics?.trial_tenants || 0, color: 'yellow', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Suspendidos', value: metrics?.suspended_tenants || 0, color: 'red', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
    { label: 'Usuarios Totales', value: metrics?.total_users || 0, color: 'blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Sucursales', value: metrics?.total_locations || 0, color: 'purple', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { label: 'Clientes Finales', value: metrics?.total_customers || 0, color: 'emerald', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'MRR (USD)', value: `$${(metrics?.mrr || 0).toFixed(0)}`, color: 'indigo', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const colorMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="space-y-6">
      <header className="mb-2">
        <h1 className="text-3xl font-black text-surface-900 tracking-tight">SaaS Central Command</h1>
        <p className="text-surface-500 mt-1">Visión global de la plataforma Loyallia — Ecuador</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            </div>
            <p className="text-xs font-medium text-surface-500 mt-1">{label}</p>
            <p className="text-3xl font-black text-surface-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Map + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="font-bold text-surface-900">Mapa de Sucursales — Ecuador</h2>
            <p className="text-xs text-surface-400">{locations.length} ubicaciones registradas</p>
          </div>
          <div className="h-[400px]">
            <LocationMap locations={locations} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <div className="p-4 border-b border-surface-100">
            <h2 className="font-bold text-surface-900">Actividad Reciente</h2>
          </div>
          <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
            {(metrics?.recent_tenants || []).map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">{t.name}</p>
                  <p className="text-xs text-surface-400">{t.city || 'Ecuador'} — {t.plan.toUpperCase()}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  t.plan === 'full' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600'
                }`}>{t.plan}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
