"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { customersApi, programsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_visits: number;
  total_spent: string;
  last_visit: string | null;
  is_active: boolean;
  created_at: string;
  notes?: string;
}

interface Program {
  id: string;
  name: string;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const editModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const LIMIT = 25;

  const role = user?.role;
  const canManageCustomers = role === "OWNER" || role === "MANAGER";
  const canDeleteCustomer = role === "OWNER";

  const dateLocale =
    locale === "en"
      ? "en-US"
      : locale === "de"
        ? "de-DE"
        : locale === "fr"
          ? "fr-FR"
          : "es-EC";

  const loadPrograms = useCallback(async () => {
    try {
      const { data } = await programsApi.list({ limit: 100 });
      setPrograms(data.programs || data.items || []);
    } catch {
      // silently fail — program filter is optional
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        limit: LIMIT,
        offset,
        search: search || undefined,
      };
      if (selectedProgram) {
        params.program_id = selectedProgram;
      }
      const { data } = await customersApi.list(params);
      setCustomers(data.customers);
      setTotal(data.total);
    } catch {
      toast.error(t("customers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [offset, search, selectedProgram, t]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    load();
  }, [load]);

  // Focus trap for edit modal
  useEffect(() => {
    if (!showEditModal) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const modal = editModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEditModal(false);
        setEditingCustomer(null);
        return;
      }
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [showEditModal]);

  // Focus trap for delete modal
  useEffect(() => {
    if (!showDeleteModal) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const modal = deleteModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
        return;
      }
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [showDeleteModal]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProgram(e.target.value);
    setOffset(0);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      notes: c.notes || "",
    });
    setShowEditModal(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSavingEdit(true);
    try {
      await customersApi.update(editingCustomer.id, editForm);
      toast.success(t("customers.customerUpdated"));
      setShowEditModal(false);
      setEditingCustomer(null);
      load();
    } catch {
      toast.error(t("customers.updateError"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (c: Customer) => {
    setTogglingId(c.id);
    try {
      await customersApi.update(c.id, { is_active: !c.is_active });
      toast.success(
        c.is_active ? t("customers.customerSuspended") : t("customers.customerActivated"),
      );
      load();
    } catch {
      toast.error(t("customers.suspendError"));
    } finally {
      setTogglingId(null);
    }
  };

  const openDeleteModal = (c: Customer) => {
    setCustomerToDelete({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
    });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await customersApi.delete(customerToDelete.id);
      toast.success(t("customers.customerDeleted"));
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      load();
    } catch {
      toast.error(t("customers.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await customersApi.importCsv(formData);
      if (data.success) {
        const parts = [
          t("customers.importSuccess", { imported: data.imported }),
          data.skipped_duplicate > 0
            ? t("customers.importSuccessDuplicates", { duplicates: data.skipped_duplicate })
            : null,
          data.skipped_invalid > 0
            ? t("customers.importSuccessInvalid", { invalid: data.skipped_invalid })
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        toast.success(parts);
        if (data.errors?.length) {
          data.errors.forEach((err: string) => toast.error(err, { duration: 6000 }));
        }
        setShowImportModal(false);
        load();
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data
          ?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("customers.importError");
      toast.error(detail);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      t("customers.templateColumns") +
      "\n" +
      t("customers.templateExample");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", t("customers.templateFilename"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">{t("customers.title")}</h1>
          <p className="text-surface-500 text-sm mt-1">
            {t("customers.registeredCustomers", { count: total.toLocaleString() })}
          </p>
        </div>
        {user?.role === "OWNER" && (
          <div className="relative" id="data-combo-wrapper">
            <button
              onClick={() => setShowDataMenu((prev) => !prev)}
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
                    setShowImportModal(true);
                    setConsentGiven(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
                  id="open-import-modal-btn"
                >
                  <svg
                    className="w-4 h-4 inline mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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

      {showImportModal && (
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
            <p className="text-sm text-surface-500 mb-4">
              {t("customers.importDescription")}
            </p>

            {/* Required columns */}
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-1">
                {t("customers.requiredColumns")}
              </p>
              <div className="flex gap-2 flex-wrap">
                {requiredColumns.map((col) => (
                  <span
                    key={col}
                    className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded border border-red-200 font-mono"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional columns */}
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">
                {t("customers.optionalColumns")}
              </p>
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

            <p className="text-xs text-surface-400 mb-5">
              {t("customers.importNote")}
            </p>

            <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <input
                type="checkbox"
                id="data-consent"
                className="mt-1 w-4 h-4 text-brand-600 rounded border-amber-300 focus:ring-brand-500"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <label
                htmlFor="data-consent"
                className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed cursor-pointer select-none"
              >
                {t("customers.consentText")}
              </label>
            </div>

            <input
              type="file"
              accept=".csv, .xls, .xlsx"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />

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
                onClick={handleDownloadTemplate}
                disabled={importing}
                id="download-template-btn"
                className="btn-ghost w-full py-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                {t("customers.downloadTemplate")}
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="btn-secondary w-full"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCustomer && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onClick={() => {
            setShowEditModal(false);
            setEditingCustomer(null);
          }}
        >
          <div
            ref={editModalRef}
            className="bg-white dark:bg-surface-900 p-6 rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-modal-title" className="text-xl font-bold mb-4">
              {t("customers.editCustomer")}
            </h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label htmlFor="edit-first-name" className="label">
                  {t("customers.firstName")}
                </label>
                <input
                  id="edit-first-name"
                  className="input"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-last-name" className="label">
                  {t("customers.lastName")}
                </label>
                <input
                  id="edit-last-name"
                  className="input"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="label">
                  {t("customers.email")}
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="input"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-phone" className="label">
                  {t("customers.phone")}
                </label>
                <input
                  id="edit-phone"
                  className="input"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="edit-notes" className="label">
                  {t("customers.notes")}
                </label>
                <textarea
                  id="edit-notes"
                  className="input min-h-[80px] resize-none"
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary flex-1"
                >
                  {savingEdit ? (
                    <span className="spinner w-4 h-4 inline-block" />
                  ) : (
                    t("common.save")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder={t("customers.searchPlaceholder")}
            id="customer-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input min-w-[180px]"
            value={selectedProgram}
            onChange={handleProgramChange}
            aria-label={t("customers.filterByProgram")}
          >
            <option value="">{t("customers.allPrograms")}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary" id="search-btn">
            {t("common.search")}
          </button>
        </form>
      </div>

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
              {canManageCustomers && (
                <th className="text-center">{t("common.actions")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={canManageCustomers ? 8 : 7}
                  className="text-center py-12 text-surface-400"
                >
                  <div className="spinner w-6 h-6 mx-auto" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td
                  colSpan={canManageCustomers ? 8 : 7}
                  className="text-center py-12 text-surface-400"
                >
                  {t("customers.noCustomersFound")}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <a
                      href={`/customers/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {c.first_name} {c.last_name}
                    </a>
                  </td>
                  <td className="text-surface-500">{c.email}</td>
                  <td className="text-surface-500">{c.phone || "—"}</td>
                  <td>{c.total_visits}</td>
                  <td>
                    ${
                      !isNaN(parseFloat(c.total_spent))
                        ? parseFloat(c.total_spent).toFixed(2)
                        : "0.00"
                    }
                  </td>
                  <td className="text-surface-500 text-xs">
                    {c.last_visit
                      ? new Date(c.last_visit).toLocaleDateString(dateLocale)
                      : "—"}
                  </td>
                  <td className="text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        c.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-surface-200 text-surface-600"
                      }`}
                    >
                      {c.is_active ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  {canManageCustomers && (
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          aria-label={`${t("common.edit")} ${c.first_name} ${c.last_name}`}
                          title={t("common.edit")}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleActive(c)}
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
                          title={
                            c.is_active ? t("customers.suspend") : t("customers.activate")
                          }
                        >
                          {c.is_active ? (
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          )}
                        </button>
                        {canDeleteCustomer && (
                          <button
                            onClick={() => openDeleteModal(c)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label={`${t("common.delete")} ${c.first_name} ${c.last_name}`}
                            title={t("common.delete")}
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
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

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            {t("customers.showing", {
              start: offset + 1,
              end: Math.min(offset + LIMIT, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              id="prev-page-btn"
            >
              {t("common.previous")}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={offset + LIMIT >= total}
              id="next-page-btn"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* LYL-H-FE-005: Standardized ConfirmModal for delete */}
      {showDeleteModal && customerToDelete && (
        <ConfirmModal
          title={t("customers.deleteCustomer")}
          message={t("customers.deleteConfirm", { name: customerToDelete.name })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setCustomerToDelete(null);
          }}
          loading={deleting}
        />
      )}
    </div>
  );
}
