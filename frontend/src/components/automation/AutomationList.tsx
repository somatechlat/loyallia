import ActionIcon from "./ActionIcon";
import { TRIGGER_LABELS, ACTION_LABELS } from "@/lib/automationConstants";
import type { Automation } from "@/hooks/useAutomations";

interface AutomationListProps {
  automations: Automation[];
  isOwner: boolean;
  onEdit: (a: Automation) => void;
  onToggle: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function AutomationList({ automations, isOwner, onEdit, onToggle, onDelete }: AutomationListProps) {
  return (
    <div className="space-y-3">
      {automations.map((a) => (
        <div key={a.id} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${a.is_active ? "bg-brand-50" : "bg-surface-100"}`}>
            <ActionIcon action={a.action} className="w-5 h-5 text-brand-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-surface-900 dark:text-white truncate">{a.name}</h3>
              <span className={a.is_active ? "badge-green" : "badge-gray"}>{a.is_active ? "Activo" : "Inactivo"}</span>
            </div>
            <p className="text-sm text-surface-500">
              {TRIGGER_LABELS[a.trigger] ?? a.trigger} → {ACTION_LABELS[a.action] ?? a.action}
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              {a.total_executions} ejecuciones
              {a.last_executed ? ` · Última: ${new Date(a.last_executed).toLocaleDateString("es-EC")}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button onClick={() => onEdit(a)} className="btn-ghost text-sm p-2" title="Editar">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onToggle(a.id, a.name)}
              className={`btn text-sm ${a.is_active ? "btn-secondary" : "btn-primary"}`}
              id={`toggle-automation-${a.id}`}
            >
              {a.is_active ? "Desactivar" : "Activar"}
            </button>
            {isOwner && (
              <button onClick={() => onDelete(a.id)} className="btn-ghost text-red-400 hover:text-red-600 text-sm p-2" title="Eliminar">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
