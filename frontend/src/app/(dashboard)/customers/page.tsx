"use client";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useCustomers } from "@/hooks/useCustomers";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CustomerHeader from "@/components/customers/CustomerHeader";
import ImportModal from "@/components/customers/ImportModal";
import EditModal from "@/components/customers/EditModal";
import CustomerTable from "@/components/customers/CustomerTable";

export default function CustomersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    customers,
    programs,
    selectedProgram,
    loading,
    importing,
    showImportModal,
    setShowImportModal,
    showDataMenu,
    setShowDataMenu,
    consentGiven,
    setConsentGiven,
    showDeleteModal,
    customerToDelete,
    showEditModal,
    editingCustomer,
    editForm,
    setEditForm,
    savingEdit,
    togglingId,
    fileInputRef,
    search,
    setSearch,
    total,
    offset,
    setOffset,
    deleting,
    canManageCustomers,
    canDeleteCustomer,
    LIMIT,
    handleSearch,
    handleProgramChange,
    openEditModal,
    closeEditModal,
    handleEditSave,
    handleToggleActive,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
    handleImport,
    handleDownloadTemplate,
  } = useCustomers();

  return (
    <div className="space-y-6">
      <CustomerHeader
        total={total}
        userRole={user?.role}
        showDataMenu={showDataMenu}
        setShowDataMenu={setShowDataMenu}
        onOpenImport={() => {
          setShowImportModal(true);
          setConsentGiven(false);
        }}
      />

      <ImportModal
        show={showImportModal}
        consentGiven={consentGiven}
        setConsentGiven={setConsentGiven}
        importing={importing}
        fileInputRef={fileInputRef}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        onClose={() => setShowImportModal(false)}
      />

      <EditModal
        show={showEditModal}
        customer={editingCustomer}
        form={editForm}
        setForm={setEditForm}
        saving={savingEdit}
        onSave={handleEditSave}
        onClose={closeEditModal}
      />

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

      <CustomerTable
        customers={customers}
        loading={loading}
        canManageCustomers={canManageCustomers}
        canDeleteCustomer={canDeleteCustomer}
        togglingId={togglingId}
        onEdit={openEditModal}
        onToggleActive={handleToggleActive}
        onDelete={openDeleteModal}
      />

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

      {showDeleteModal && customerToDelete && (
        <ConfirmModal
          title={t("customers.deleteCustomer")}
          message={t("customers.deleteConfirm", { name: customerToDelete.name })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onConfirm={handleDelete}
          onCancel={closeDeleteModal}
          loading={deleting}
        />
      )}
    </div>
  );
}
