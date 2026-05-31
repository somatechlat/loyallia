'use client';
import { useEffect, useState, useCallback } from 'react';
import centralizedApi from '@/lib/api';
import TenantList from '@/components/superadmin/tenants/TenantList';
import TenantWizard from '@/components/superadmin/tenants/TenantWizard';
import TenantDetailModal from '@/components/superadmin/tenants/TenantDetailModal';

const api = (path: string, opts?: { method?: string; body?: string }) => {
  const url = `/api/v1/admin${path}`;
  const method = (opts?.method || 'GET').toLowerCase();
  const body = opts?.body ? JSON.parse(opts.body) : undefined;
  return centralizedApi({ url, method, data: body });
};

interface Plan {
  slug: string;
  name: string;
  price_monthly: number;
  trial_days: number;
  is_active: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  legal_name?: string;
  ruc?: string;
  cedula?: string;
  entity_type?: string;
  industry?: string;
  province?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  plan: string;
  is_active: boolean;
  user_count: number;
  location_count: number;
  trial_days_remaining?: number;
  created_at: string;
}

interface CreationResult {
  tenant_id?: string;
  owner_email?: string;
  temp_password?: string;
}

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [dt, setDt] = useState<Tenant | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([api('/tenants/'), api('/plans/')]);
      setTenants(tRes.data);
      setPlans(pRes.data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Creation Result */}
      {creationResult && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-brand-900 mb-2">Negocio creado correctamente</h3>
          <div className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-brand-100 font-mono text-sm space-y-2">
            <p><span className="font-bold text-surface-500">Tenant ID:</span> {creationResult.tenant_id}</p>
            <p><span className="font-bold text-surface-500">Email Owner:</span> {creationResult.owner_email}</p>
            <p><span className="font-bold text-surface-500">Password Temporal:</span> <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded">{creationResult.temp_password}</span></p>
          </div>
          <button onClick={() => setCreationResult(null)} className="mt-3 text-sm text-brand-600 hover:text-brand-800 font-medium">Cerrar</button>
        </div>
      )}

      <TenantList
        tenants={tenants}
        loading={loading}
        onOpenWizard={() => { setCreationResult(null); setWizardOpen(true); }}
        onOpenDetail={setDt}
      />

      <TenantWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        plans={plans}
        onSuccess={(result) => { setCreationResult(result); fetchData(); }}
      />

      <TenantDetailModal
        tenant={dt}
        onClose={() => setDt(null)}
        onUpdate={fetchData}
      />
    </div>
  );
}
