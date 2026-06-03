import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { Customer, EditForm } from "@/hooks/useCustomers";

interface EditModalProps {
  show: boolean;
  customer: Customer | null;
  form: EditForm;
  setForm: React.Dispatch<React.SetStateAction<EditForm>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function EditModal({ show, customer, form, setForm, saving, onSave, onClose }: EditModalProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap({ isOpen: show, onEscape: onClose, containerRef: modalRef });

  if (!show || !customer) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-surface-900 p-6 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-modal-title" className="text-xl font-bold mb-4">
          {t("customers.editCustomer")}
        </h2>
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label htmlFor="edit-first-name" className="label">
              {t("customers.firstName")}
            </label>
            <input
              id="edit-first-name"
              className="input"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
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
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
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
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="edit-notes" className="label">
              {t("customers.notes")}
            </label>
            <textarea
              id="edit-notes"
              className="input min-h-[80px] resize-none"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <span className="spinner w-4 h-4 inline-block" /> : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
