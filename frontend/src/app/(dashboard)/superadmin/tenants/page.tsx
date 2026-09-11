'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import centralizedApi from '@/lib/api';
import TenantList from '@/components/superadmin/tenants/TenantList';
import TenantWizard from '@/components/superadmin/tenants/TenantWizard';
import TenantDetailModal from '@/components/superadmin/tenants/TenantDetailModal';

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
  const { t } = useI18n();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [dt, setDt] = useState<Tenant | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        centralizedApi.get('/api/v1/admin/tenants/'),
        centralizedApi.get('/api/v1/admin/plans/'),
      ]);
      setTenants(tRes.data);
      setPlans(pRes.data);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = tenants;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q) ||
        (t.ruc || '').toLowerCase().includes(q) ||
        t.plan.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') list = list.filter(t => t.is_active);
    if (statusFilter === 'inactive') list = list.filter(t => !t.is_active);
    return list;
  }, [tenants, search, statusFilter]);

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    inactive: tenants.filter(t => !t.is_active).length,
  }), [tenants]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white tracking-tight">
            {t('superadmin.tenants.title')}
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">
            {stats.total} {t('superadmin.tenants.total')} · {stats.active} {t('superadmin.tenants.active')} · {stats.inactive} {t('superadmin.tenants.inactive')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder={t('superadmin.tenants.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm w-48"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm"
          >
            <option value="all">{t('superadmin.tenants.filterAll')}</option>
            <option value="active">{t('superadmin.tenants.filterActive')}</option>
            <option value="inactive">{t('superadmin.tenants.filterInactive')}</option>
          </select>
        </div>
      </header>

      {creationResult && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-brand-900 mb-2">{t('superadmin.tenants.tenantCreated')}</h3>
          <div className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-brand-100 font-mono text-sm space-y-2">
            <p><span className="font-bold text-surface-500">{t('superadmin.tenants.tenantId')}</span> {creationResult.tenant_id}</p>
            <p><span className="font-bold text-surface-500">{t('superadmin.tenants.emailOwner')}</span> {creationResult.owner_email}</p>
            <p><span className="font-bold text-surface-500">{t('superadmin.tenants.tempPassword')}</span> <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded">{creationResult.temp_password}</span></p>
          </div>
          <button onClick={() => setCreationResult(null)} className="mt-3 text-sm text-brand-600 hover:text-brand-800 font-medium">{t('common.close')}</button>
        </div>
      )}

      <TenantList
        tenants={filtered}
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
