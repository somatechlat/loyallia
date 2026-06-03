/**
 * Represents a tenant (business) in the list view.
 */
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

/**
 * Props for the TenantList component.
 */
interface TenantListProps {
  /** Array of tenants to display */
  tenants: Tenant[];
  /** Whether data is loading */
  loading: boolean;
  /** Opens the registration wizard */
  onOpenWizard: () => void;
  /** Opens the detail modal for a tenant */
  onOpenDetail: (t: Tenant) => void;
}

import { useI18n } from '@/lib/i18n';

const ArrowIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

const PlusIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);

/**
 * @description Table list of tenants with plan badges and action buttons.
 * @param {TenantListProps} props - Component props
 * @returns JSX.Element
 */
export default function TenantList({ tenants, loading, onOpenWizard, onOpenDetail }: TenantListProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">{t('superadmin.tenants.title')}</h1>
          <p className="text-surface-500 mt-1">{t('superadmin.tenants.registeredCount', { count: tenants.length })}</p>
        </div>
        <button id="btn-wizard-open" onClick={onOpenWizard} className="btn-primary flex items-center gap-2">
          {PlusIcon} {t('superadmin.tenants.registerBusiness')}
        </button>
      </div>

      <div className="bg-white dark:bg-surface-900 shadow-sm border border-surface-200 dark:border-surface-700 rounded-2xl overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><div className="spinner w-8 h-8" /></div> : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-50 border-b border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-500 uppercase tracking-wide">
              <th className="px-5 py-3">{t('superadmin.metrics.table.business')}</th><th className="px-5 py-3">{t('superadmin.tenants.detail.info.ruc')} / {t('superadmin.tenants.detail.info.idCard')}</th><th className="px-5 py-3">{t('superadmin.metrics.table.city')}</th><th className="px-5 py-3">{t('superadmin.metrics.table.plan')}</th><th className="px-5 py-3 text-center">{t('superadmin.metrics.table.users')}</th><th className="px-5 py-3 text-center">{t('superadmin.metrics.table.locations')}</th><th className="px-5 py-3">{t('superadmin.metrics.table.status')}</th><th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-surface-100 text-sm text-surface-900 dark:text-white">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-surface-50 transition-colors cursor-pointer" onClick={() => onOpenDetail(tenant)}>
                  <td className="px-5 py-3"><p className="font-semibold">{tenant.name}</p>{tenant.legal_name && <p className="text-xs text-surface-400 truncate max-w-[180px]">{tenant.legal_name}</p>}</td>
                  <td className="px-5 py-3 font-mono text-xs">{tenant.ruc || tenant.cedula || '—'}</td>
                  <td className="px-5 py-3">{tenant.city||'—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tenant.plan==='full'?'bg-brand-100 text-brand-700':tenant.plan==='trial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{tenant.plan.toUpperCase()}</span></td>
                  <td className="px-5 py-3 text-center">{tenant.user_count}</td>
                  <td className="px-5 py-3 text-center">{tenant.location_count}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${tenant.is_active?'bg-green-500':'bg-red-500'}`} />{tenant.is_active?t('common.active'):t('common.inactive')}</span></td>
                  <td className="px-5 py-3 text-brand-500">{ArrowIcon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
