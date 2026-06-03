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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Negocios</h1>
          <p className="text-surface-500 mt-1">{tenants.length} clientes corporativos registrados</p>
        </div>
        <button id="btn-wizard-open" onClick={onOpenWizard} className="btn-primary flex items-center gap-2">
          {PlusIcon} Registrar Negocio
        </button>
      </div>

      <div className="bg-white dark:bg-surface-900 shadow-sm border border-surface-200 dark:border-surface-700 rounded-2xl overflow-hidden">
        {loading ? <div className="p-12 flex justify-center"><div className="spinner w-8 h-8" /></div> : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-50 border-b border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-500 uppercase tracking-wide">
              <th className="px-5 py-3">Negocio</th><th className="px-5 py-3">RUC / Cédula</th><th className="px-5 py-3">Ciudad</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3 text-center">Usuarios</th><th className="px-5 py-3 text-center">Sucursales</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-surface-100 text-sm text-surface-900 dark:text-white">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-surface-50 transition-colors cursor-pointer" onClick={() => onOpenDetail(t)}>
                  <td className="px-5 py-3"><p className="font-semibold">{t.name}</p>{t.legal_name && <p className="text-xs text-surface-400 truncate max-w-[180px]">{t.legal_name}</p>}</td>
                  <td className="px-5 py-3 font-mono text-xs">{t.ruc || t.cedula || '—'}</td>
                  <td className="px-5 py-3">{t.city||'—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.plan==='full'?'bg-brand-100 text-brand-700':t.plan==='trial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{t.plan.toUpperCase()}</span></td>
                  <td className="px-5 py-3 text-center">{t.user_count}</td>
                  <td className="px-5 py-3 text-center">{t.location_count}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${t.is_active?'bg-green-500':'bg-red-500'}`} />{t.is_active?'Activo':'Suspendido'}</span></td>
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
