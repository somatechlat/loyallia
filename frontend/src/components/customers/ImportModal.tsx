import { useI18n } from "@/lib/i18n";

interface ImportModalProps {
  show: boolean;
  consentGiven: boolean;
  setConsentGiven: (v: boolean) => void;
  importing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onClose: () => void;
}

export default function ImportModal({
  show,
  consentGiven,
  setConsentGiven,
  importing,
  fileInputRef,
  onImport,
  onDownloadTemplate,
  onClose,
}: ImportModalProps) {
  const { t } = useI18n();

  if (!show) return null;

  const requiredColumns = [t("customers.colEmail"), t("customers.colName")];
  const optionalColumns = [
    t("customers.colLastName"),
    t("customers.colPhone"),
    t("customers.colBirthDate"),
    t("customers.colGender"),
    t("customers.colNotes"),
    t("customers.colTotalSpent"),
    t("customers.colTotalVisits"),
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 id="import-modal-title" className="text-xl font-bold mb-1">
          {t("customers.importTitle")}
        </h2>
        <p className="text-sm text-surface-500 mb-4">{t("customers.importDescription")}</p>

        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-1">{t("customers.requiredColumns")}</p>
          <div className="flex gap-2 flex-wrap">
            {requiredColumns.map((col) => (
              <span key={col} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded border border-red-200 font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">{t("customers.optionalColumns")}</p>
          <div className="flex gap-2 flex-wrap">
            {optionalColumns.map((col) => (
              <span
                key={col}
                className="bg-surface-100 text-surface-600 text-xs px-2 py-1 rounded border border-surface-200 dark:border-surface-700 font-mono"
              >
                {col}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-surface-400 mb-5">{t("customers.importNote")}</p>

        <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <input
            type="checkbox"
            id="data-consent"
            className="mt-1 w-4 h-4 text-brand-600 rounded border-amber-300 focus:ring-brand-500"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
          />
          <label htmlFor="data-consent" className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed cursor-pointer select-none">
            {t("customers.consentText")}
          </label>
        </div>

        <input type="file" accept=".csv, .xls, .xlsx" ref={fileInputRef} onChange={onImport} className="hidden" />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || !consentGiven}
            id="select-import-file-btn"
            className="btn-primary w-full flex justify-center items-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <div className="spinner w-4 h-4" /> {t("common.processing")}
              </>
            ) : (
              t("customers.selectFile")
            )}
          </button>
          <button
            onClick={onDownloadTemplate}
            disabled={importing}
            id="download-template-btn"
            className="btn-ghost w-full py-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          >
            {t("customers.downloadTemplate")}
          </button>
          <button onClick={onClose} disabled={importing} className="btn-secondary w-full">
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
