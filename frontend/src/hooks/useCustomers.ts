"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { customersApi, programsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import toast from "react-hot-toast";

export interface Customer {
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

export interface Program {
  id: string;
  name: string;
}

export interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

const LIMIT = 25;

export function useCustomers() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
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

  const role = user?.role;
  const canManageCustomers = role === "OWNER" || role === "MANAGER";
  const canDeleteCustomer = role === "OWNER";

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

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setOffset(0);
      load();
    },
    [load],
  );

  const handleProgramChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProgram(e.target.value);
    setOffset(0);
  }, []);

  const openEditModal = useCallback((c: Customer) => {
    setEditingCustomer(c);
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      notes: c.notes || "",
    });
    setShowEditModal(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCustomer(null);
  }, []);

  const handleEditSave = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [editingCustomer, editForm, load, t],
  );

  const handleToggleActive = useCallback(
    async (c: Customer) => {
      setTogglingId(c.id);
      try {
        await customersApi.update(c.id, { is_active: !c.is_active });
        toast.success(c.is_active ? t("customers.customerSuspended") : t("customers.customerActivated"));
        load();
      } catch {
        toast.error(t("customers.suspendError"));
      } finally {
        setTogglingId(null);
      }
    },
    [load, t],
  );

  const openDeleteModal = useCallback((c: Customer) => {
    setCustomerToDelete({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
    });
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  }, []);

  const handleDelete = useCallback(async () => {
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
  }, [customerToDelete, load, t]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            data.skipped_duplicate > 0 ? t("customers.importSuccessDuplicates", { duplicates: data.skipped_duplicate }) : null,
            data.skipped_invalid > 0 ? t("customers.importSuccessInvalid", { invalid: data.skipped_invalid }) : null,
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
          (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ||
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t("customers.importError");
        toast.error(detail);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [load, t],
  );

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = t("customers.templateColumns") + "\n" + t("customers.templateExample");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", t("customers.templateFilename"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [t]);

  return {
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
    load,
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
  };
}
