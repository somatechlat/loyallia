interface DeleteModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ onCancel, onConfirm }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">¿Eliminar automatización?</h3>
        <p className="text-surface-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-danger flex-1 text-sm" id="confirm-delete-automation">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
