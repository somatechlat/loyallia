import { useI18n } from "@/lib/i18n";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  canManageCustomers: boolean;
  canDeleteCustomer: boolean;
  togglingId: string | null;
  onEdit: (c: Customer) => void;
  onToggleActive: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}

export default function CustomerTable({
  customers,
  loading,
  canManageCustomers,
  canDeleteCustomer,
  togglingId,
  onEdit,
  onToggleActive,
  onDelete,
}: CustomerTableProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "es-EC";
  const colSpan = canManageCustomers ? 8 : 7;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>{t("customers.customer")}</th>
            <th>{t("customers.email")}</th>
            <th>{t("customers.phone")}</th>
            <th>{t("customers.visits")}</th>
            <th>{t("customers.totalSpent")}</th>
            <th>{t("customers.lastVisit")}</th>
            <th>{t("common.status")}</th>
            {canManageCustomers && <th className="text-center">{t("common.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-12 text-surface-400">
                <div className="spinner w-6 h-6 mx-auto" />
              </td>
            </tr>
          ) : customers.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-12 text-surface-400">
                {t("customers.noCustomersFound")}
              </td>
            </tr>
          ) : (
            customers.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">
                  <a href={`/customers/${c.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                    {c.first_name} {c.last_name}
                  </a>
                </td>
                <td className="text-surface-500">{c.email}</td>
                <td className="text-surface-500">{c.phone || "—"}</td>
                <td>{c.total_visits}</td>
                <td>${!isNaN(parseFloat(c.total_spent)) ? parseFloat(c.total_spent).toFixed(2) : "0.00"}</td>
                <td className="text-surface-500 text-xs">
                  {c.last_visit ? new Date(c.last_visit).toLocaleDateString(dateLocale) : "—"}
                </td>
                <td className="text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-surface-200 text-surface-600"
                    }`}
                  >
                    {c.is_active ? t("common.active") : t("common.inactive")}
                  </span>
                </td>
                {canManageCustomers && (
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        aria-label={`${t("common.edit")} ${c.first_name} ${c.last_name}`}
                        title={t("common.edit")}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onToggleActive(c)}
                        disabled={togglingId === c.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          c.is_active
                            ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        aria-label={
                          c.is_active
                            ? `${t("customers.suspend")} ${c.first_name} ${c.last_name}`
                            : `${t("customers.activate")} ${c.first_name} ${c.last_name}`
                        }
                        title={c.is_active ? t("customers.suspend") : t("customers.activate")}
                      >
                        {c.is_active ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                      {canDeleteCustomer && (
                        <button
                          onClick={() => onDelete(c)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`${t("common.delete")} ${c.first_name} ${c.last_name}`}
                          title={t("common.delete")}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
