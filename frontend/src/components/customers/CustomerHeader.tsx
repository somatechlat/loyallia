import { useI18n } from "@/lib/i18n";
import { customersApi } from "@/lib/api";

interface CustomerHeaderProps {
  total: number;
  userRole?: string;
  showDataMenu: boolean;
  setShowDataMenu: (v: boolean) => void;
  onOpenImport: () => void;
}

export default function CustomerHeader({ total, userRole, showDataMenu, setShowDataMenu, onOpenImport }: CustomerHeaderProps) {
  const { t } = useI18n();
  const isOwner = userRole === "OWNER";

  return (
    <div className="page-header flex justify-between items-center">
      <div>
        <h1 className="page-title">{t("customers.title")}</h1>
        <p className="text-surface-500 text-sm mt-1">
          {t("customers.registeredCustomers", { count: total.toLocaleString() })}
        </p>
      </div>
      {isOwner && (
        <div className="relative" id="data-combo-wrapper">
          <button
            onClick={() => setShowDataMenu(!showDataMenu)}
            className="btn-secondary flex items-center gap-2"
            id="data-combo-btn"
          >
            <span>{t("customers.data")}</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showDataMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 z-50 py-1">
              <button
                onClick={() => {
                  setShowDataMenu(false);
                  window.location.href = customersApi.exportCsvUrl();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
                id="export-csv-btn"
              >
                📥 {t("customers.exportCsv")}
              </button>
              <button
                onClick={() => {
                  setShowDataMenu(false);
                  onOpenImport();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
                id="open-import-modal-btn"
              >
                <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {t("customers.importDb")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
