'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; date_joined: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '', is_active: true });
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'MANAGER', send_email: true });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const token = Cookies.get('access_token');
  const headers: HeadersInit = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTeam = () => {
    fetch('/api/v1/tenants/team/', { headers })
      .then(r => r.json())
      .then(data => setMembers((data || []).filter((m: TeamMember) => m.role !== 'SUPER_ADMIN')))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeam(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOwner = user?.role === 'OWNER';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Invitando...');
    try {
      const res = await fetch('/api/v1/tenants/team/', {
        method: 'POST', headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Error');
      toast.success('Miembro creado exitosamente', { id: toastId });
      setCreatedPassword(data.temp_password || null);
      setInviting(false);
      setForm({ email: '', first_name: '', last_name: '', role: 'MANAGER', send_email: true });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al invitar';
      toast.error(msg, { id: toastId });
    }
  };

  const handleUpdate = async (memberId: string) => {
    const toastId = toast.loading('Actualizando...');
    try {
      const res = await fetch(`/api/v1/tenants/team/${memberId}/`, {
        method: 'PATCH', headers,
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Error');
      toast.success('Miembro actualizado', { id: toastId });
      setEditingId(null);
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      toast.error(msg, { id: toastId });
    }
  };

  const handleDelete = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Estas seguro de eliminar a ${memberEmail}? Esta accion no se puede deshacer.`)) return;
    const toastId = toast.loading('Eliminando...');
    try {
      const res = await fetch(`/api/v1/tenants/team/${memberId}/`, {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Error');
      toast.success('Miembro eliminado', { id: toastId });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      toast.error(msg, { id: toastId });
    }
  };

  const toggleActive = async (member: TeamMember) => {
    const toastId = toast.loading(member.is_active ? 'Desactivando...' : 'Activando...');
    try {
      const res = await fetch(`/api/v1/tenants/team/${member.id}/`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (!res.ok) throw new Error('Error');
      toast.success(member.is_active ? 'Miembro desactivado' : 'Miembro activado', { id: toastId });
      fetchTeam();
    } catch {
      toast.error('Error al actualizar estado', { id: toastId });
    }
  };

  const startEdit = (m: TeamMember) => {
    setEditingId(m.id);
    setEditForm({ role: m.role, is_active: m.is_active });
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      OWNER: 'bg-purple-100 text-purple-700 border border-purple-200',
      MANAGER: 'bg-blue-100 text-blue-700 border border-blue-200',
      STAFF: 'bg-surface-200 text-surface-700 border border-surface-300',
      SUPER_ADMIN: 'bg-red-100 text-red-700 border border-red-200',
    };
    return map[role] || map.STAFF;
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OWNER: 'Propietario',
      MANAGER: 'Gerente',
      STAFF: 'Personal',
      SUPER_ADMIN: 'Super Admin',
    };
    return labels[role] || role;
  };

  if (loading) return <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 tracking-tight">Equipo</h1>
          <p className="text-surface-500 mt-1">Gestion de usuarios de {user?.tenant_name} -- {members.length} miembro(s)</p>
        </div>
        {isOwner && (
          <button onClick={() => setInviting(!inviting)} className="btn-primary flex items-center gap-2" id="invite-member-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Agregar Miembro
          </button>
        )}
      </div>

      {/* Invite form */}
      {inviting && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 animate-slide-up">
          <h2 className="text-lg font-bold text-surface-900 mb-4">Invitar Miembro</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Nombre</label>
              <input required className="input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Apellido</label>
              <input required className="input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input required type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Rol</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="MANAGER">Gerente (Manager)</option>
                <option value="STAFF">Personal / Cajero (Staff)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.send_email} onChange={() => setForm(f => ({ ...f, send_email: !f.send_email }))}
                  className="w-4 h-4 accent-indigo-600 rounded" />
                <div>
                  <span className="text-sm font-medium text-surface-700">Enviar credenciales por email</span>
                  <p className="text-xs text-surface-400">Se enviará un correo con la contraseña temporal al nuevo miembro</p>
                </div>
              </label>
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-surface-100">
              <button type="button" onClick={() => setInviting(false)} className="px-4 py-2 text-surface-600">Cancelar</button>
              <button type="submit" className="btn-primary">Crear Miembro</button>
            </div>
          </form>
        </div>
      )}

      {/* Password created modal */}
      {createdPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-surface-900">Miembro creado exitosamente</h3>
              <p className="text-sm text-surface-500 mt-1">La contrase\u00f1a temporal generada es:</p>
            </div>
            <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 text-center mb-4">
              <code className="text-xl font-mono font-bold text-indigo-600 tracking-widest select-all">{createdPassword}</code>
              <p className="text-[10px] text-surface-400 mt-2">Haz click para seleccionar y copiar</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700">
                <strong>⚠️ Importante:</strong> Guarda esta contraseña. El miembro debe cambiarla al iniciar sesión por primera vez.
              </p>
            </div>
            <button onClick={() => setCreatedPassword(null)} className="btn-primary w-full">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-xs font-medium text-surface-500 uppercase tracking-wide">
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Rol</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Ingreso</th>
              {isOwner && <th className="px-5 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 text-sm">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                      <span className="text-brand-600 font-bold text-sm">{(m.first_name || '?')[0]}</span>
                    </div>
                    <span className="font-medium text-surface-900">{m.first_name} {m.last_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-surface-600">{m.email}</td>
                <td className="px-5 py-3">
                  {editingId === m.id ? (
                    <select className="input text-xs py-1 w-28" value={editForm.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                      <option value="MANAGER">Gerente</option>
                      <option value="STAFF">Personal</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge(m.role)}`}>{roleLabel(m.role)}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {isOwner && m.id !== user?.id ? (
                    <button onClick={() => toggleActive(m)}
                      className="flex items-center gap-1.5 group cursor-pointer" title={m.is_active ? 'Click para desactivar' : 'Click para activar'}>
                      <span className={`w-2 h-2 rounded-full transition-colors ${m.is_active ? 'bg-green-500 group-hover:bg-red-400' : 'bg-red-500 group-hover:bg-green-400'}`} />
                      <span className="text-sm">{m.is_active ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-surface-400">{new Date(m.date_joined).toLocaleDateString('es-EC')}</td>
                {isOwner && (
                  <td className="px-5 py-3 text-right">
                    {m.id === user?.id ? (
                      <span className="text-xs text-surface-400">Tu</span>
                    ) : editingId === m.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleUpdate(m.id)} className="btn-primary text-xs px-2 py-1">Guardar</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(m)} className="btn-ghost text-xs px-2 py-1" id={`edit-member-${m.id}`}
                          title="Editar rol">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(m.id, m.email)} className="btn-ghost text-xs px-2 py-1 text-red-500 hover:text-red-700" id={`delete-member-${m.id}`}
                          title="Eliminar">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
