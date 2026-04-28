"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { customersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

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
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customersApi.list({
        limit: LIMIT,
        offset,
        search: search || undefined,
      });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [offset, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Focus trap for delete modal
  useEffect(() => {
    if (!showDeleteModal) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const modal = deleteModalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [showDeleteModal]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  const openDeleteModal = (c: Customer) => {
    setCustomerToDelete({ id: c.id, name: `${c.first_name} ${c.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await customersApi.delete(customerToDelete.id);
      toast.success("Cliente eliminado");
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      load();
    } catch {
      toast.error("Error al eliminar cliente");
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
          `${data.imported} importados`,
          data.skipped_duplicate > 0
            ? `${data.skipped_duplicate} duplicados omitidos`
            : null,
          data.skipped_invalid > 0
            ? `${data.skipped_invalid} filas inválidas`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        toast.success(parts);
        if (data.errors?.length) {
          data.errors.forEach((e: string) =>
            toast.error(e, { duration: 6000 }),
          );
        }
        setShowImportModal(false);
        load();
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Error al importar archivo";
      toast.error(detail);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="text-surface-500 text-sm mt-1">
            {total.toLocaleString()} clientes registrados
          </p>
        </div>
        {user?.role === "OWNER" && (
          <button
            onClick={() => {
              setShowImportModal(true);
              setConsentGiven(false);
            }}
            className="btn-secondary"
            id="open-import-modal-btn"
          >
            Importar DB (XLS/CSV)
          </button>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
          <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 id="import-modal-title" className="text-xl font-bold mb-1">
              Importar Base de Clientes
            </h2>
            <p className="text-sm text-surface-500 mb-4">
              Sube un archivo XLS, XLSX o CSV. El sistema lo depura
              automáticamente antes de importar.
            </p>

            {/* Required columns */}
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-1">
                Columnas Obligatorias
              </p>
              <div className="flex gap-2 flex-wrap">
                {["email / correo", "nombre / first_name"].map((col) => (
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
                Columnas Opcionales
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  "apellido",
                  "telefono",
                  "fecha_nacimiento",
                  "genero (M/F/O)",
                  "notas",
                  "gasto_total",
                  "visitas_totales",
                ].map((col) => (
                  <span
                    key={col}
                    className="bg-surface-100 text-surface-600 text-xs px-2 py-1 rounded border border-surface-200 font-mono"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-surface-400 mb-5">
              Emails duplicados se omiten automaticamente. Filas con email
              invalido o nombre vacio son descartadas y reportadas.
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
                Declaro bajo juramento que he obtenido el{" "}
                <strong>consentimiento expreso e inequívoco</strong> de todos
                los titulares de los datos en este archivo para su tratamiento,
                cumpliendo estrictamente con la{" "}
                <strong>
                  Ley Orgánica de Protección de Datos Personales (LOPDP) de
                  Ecuador
                </strong>
                .
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
                    <div className="spinner w-4 h-4" /> Procesando...
                  </>
                ) : (
                  "Seleccionar Archivo"
                )}
              </button>
              <button
                onClick={() => {
                  const csvContent =
                    "nombre,apellido,email,telefono,fecha_nacimiento,genero,notas,gasto_total,visitas_totales\n" +
                    "Juan,Perez,juan@ejemplo.com,+593991234567,1990-01-01,M,Cliente VIP,150.50,5";
                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute(
                    "download",
                    "plantilla_clientes_loyallia.csv",
                  );
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={importing}
                id="download-template-btn"
                className="btn-ghost w-full py-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                Descargar Plantilla CSV
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="btn-secondary w-full"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Buscar por nombre, email o teléfono..."
            id="customer-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary" id="search-btn">
            Buscar
          </button>
        </form>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Visitas</th>
              <th>Gasto total</th>
              <th>Última visita</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-surface-400">
                  <div className="spinner w-6 h-6 mx-auto" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-surface-400">
                  No se encontraron clientes
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
                  <td>${parseFloat(c.total_spent).toFixed(2)}</td>
                  <td className="text-surface-500 text-xs">
                    {c.last_visit
                      ? new Date(c.last_visit).toLocaleDateString("es-EC")
                      : "—"}
                  </td>
                  <td className="text-center">
                    {c.is_active ? (
                      <button
                        onClick={() => openDeleteModal(c)}
                        className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600 hover:bg-red-200 font-medium"
                        id={`delete-customer-${c.id}`}
                      >
                        Eliminar
                      </button>
                    ) : (
                      <span className="badge-gray">Inactivo</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            Mostrando {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              disabled={offset === 0}
              id="prev-page-btn"
            >
              Anterior
            </button>
            <button
              className="btn-secondary"
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={offset + LIMIT >= total}
              id="next-page-btn"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" ref={deleteModalRef}>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 id="delete-modal-title" className="text-xl font-bold text-white mb-2">
                Eliminar Cliente
              </h3>
              <p className="text-white/70 mb-6">
                ¿Estás seguro de eliminar a{" "}
                <span className="font-semibold text-white">
                  {customerToDelete?.name}
                </span>
                ? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
