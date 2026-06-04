'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { UserRole } from '@/types';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';

/**
 * Single audit log entry.
 */
interface AuditEntry {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Props for the AuditLogSection component.
 */
interface AuditLogSectionProps {
  /** Role of the current user */
  userRole: string | undefined;
}


const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  denied: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  error: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
};

/**
 * @description Displays recent audit log entries for the tenant owner.
 * @param {AuditLogSectionProps} props - Component props
 * @returns JSX.Element | null
 */
export default function AuditLogSection({ userRole }: AuditLogSectionProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const { t } = useI18n();

  const ACTION_LABELS: Record<string, string> = {
    CREATE: t('audit.actions.create'),
    READ: t('audit.actions.read'),
    UPDATE: t('audit.actions.update'),
    DELETE: t('audit.actions.delete'),
    EXPORT: t('audit.actions.export'),
    IMPORT: t('audit.actions.import'),
    IMPERSONATE: t('audit.actions.impersonate'),
    LOGIN: t('audit.actions.login'),
    LOGOUT: t('audit.actions.logout'),
    API_ACCESS: t('audit.actions.apiAccess'),
    FACTORY_RESET: t('audit.actions.factoryReset'),
    SEED_DEMO: t('audit.actions.seedDemo'),
  };

  useEffect(() => {
    if (userRole !== UserRole.OWNER) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get('/api/v1/audit/');
        setEntries(data.entries || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t('audit.loadError');
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [userRole]);

  if (userRole !== UserRole.OWNER) return null;

  const visible = showAll ? entries : entries.slice(0, 5);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-surface-900 dark:text-white">{t('audit.sectionTitle')}</h3>
          <p className="text-xs text-surface-400">{t('audit.sectionSubtitle')}</p>
        </div>
        {entries.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium"
          >
            {showAll ? t('common.showLess') : `${t('audit.viewAll')} (${entries.length})`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-surface-200 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-surface-400 text-center py-4">{t('audit.emptyState')}</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 text-sm"
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[entry.status] || 'text-surface-500 bg-surface-100'}`}>
                {entry.status}
              </span>
              <span className="font-medium text-surface-700 dark:text-surface-200 min-w-[80px]">
                {ACTION_LABELS[entry.action] || entry.action}
              </span>
              <span className="text-surface-500 text-xs flex-1 truncate">
                {entry.resource_type}
                {entry.actor_email && entry.actor_email !== 'anonymous' && (
                  <span className="text-surface-400 ml-1">— {entry.actor_email}</span>
                )}
              </span>
              <span className="text-[10px] text-surface-400 whitespace-nowrap">
                {new Date(entry.created_at).toLocaleDateString(navigator.language, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
