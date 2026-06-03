'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';

interface TeamMember {
  id: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; date_joined: string;
}

export default function TeamPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '', is_active: true });
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: UserRole.MANAGER, send_email: true });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState({ first_name: false, last_name: false, email: false });

  const fetchTeam = () => {
    api.get('/api/v1/tenants/team/')
      .then(({ data }) => setMembers((data || []).filter((m: TeamMember) => m.role !== UserRole.SUPER_ADMIN)))
      .catch(() => {
        toast.error(t("team.loadError"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeam(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOwner = user?.role === UserRole.OWNER;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      first_name: !form.first_name.trim(),
      last_name: !form.last_name.trim(),
      email: !form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    const toastId = toast.loading(t('team.inviting'));
    try {
      const { data } = await api.post('/api/v1/tenants/team/', form);
      toast.success(t('team.memberCreated'), { id: toastId });
      setCreatedPassword(data.temp_password || null);
      setInviting(false);
      setForm({ email: '', first_name: '', last_name: '', role: UserRole.MANAGER, send_email: true });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('team.inviteError');
      toast.error(msg, { id: toastId });
    }
  };

  const handleUpdate = async (memberId: string) => {
    const toastId = toast.loading(t('team.updating'));
    try {
      await api.patch(`/api/v1/tenants/team/${memberId}/`, editForm);
      toast.success(t('team.memberUpdated'), { id: toastId });
      setEditingId(null);
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('team.updateError');
      toast.error(msg, { id: toastId });
    }
  };

  const handleDelete = async (memberId: string, memberEmail: string) => {
    if (!confirm(t('team.deleteConfirm', { email: memberEmail }))) return;
    const toastId = toast.loading(t('team.deleting'));
    try {
      await api.delete(`/api/v1/tenants/team/${memberId}/`);
      toast.success(t('team.memberDeleted'), { id: toastId });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('team.deleteError');
      toast.error(msg, { id: toastId });
    }
  };

  const toggleActive = async (member: TeamMember) => {
    const toastId = toast.loading(member.is_active ? t('team.deactivating') : t('team.activating'));
    try {
      await api.patch(`/api/v1/tenants/team/${member.id}/`, { is_active: !member.is_active });
      toast.success(member.is_active ? t('team.memberDeactivated') : t('team.memberActivated'), { id: toastId });
      fetchTeam();
    } catch {
      toast.error(t('team.statusUpdateError'), { id: toastId });
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
    return t(`team.roles.${role}`) || role;
  };

  if (loading) return <div className="flex justify-center p-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">{t('team.title')}</h1>
          <p className="text-surface-500 mt-1">{t('team.subtitle', { tenant: user?.tenant_name || '', count: members.length })}</p>
        </div>
        {isOwner && (
          <button onClick={() => setInviting(!inviting)} className="btn-primary flex items-center gap-2" id="invite-member-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t('team.addMember')}
          </button>
        )}
      </div>

      {/* Invite form */}
      {inviting && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 animate-slide-up">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">{t('team.inviteMember')}</h2>
          <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('auth.firstName')}</label>
              <input required className={`input ${formErrors.first_name ? 'border-red-500' : ''}`} maxLength={100} value={form.first_name}
                onChange={e => { setForm({...form, first_name: e.target.value }); setFormErrors(err => ({ ...err, first_name: false })); }} />
              {formErrors.first_name && <p className="text-xs text-red-500 mt-1">{t('team.firstNameRequired')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('auth.lastName')}</label>
              <input required className={`input ${formErrors.last_name ? 'border-red-500' : ''}`} maxLength={100} value={form.last_name}
                onChange={e => { setForm({...form, last_name: e.target.value }); setFormErrors(err => ({ ...err, last_name: false })); }} />
              {formErrors.last_name && <p className="text-xs text-red-500 mt-1">{t('team.lastNameRequired')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('auth.email')}</label>
              <input required type="email" className={`input ${formErrors.email ? 'border-red-500' : ''}`} value={form.email} maxLength={254}
                onChange={e => { setForm({...form, email: e.target.value }); setFormErrors(err => ({ ...err, email: false })); }} />
              {formErrors.email && <p className="text-xs text-red-500 mt-1">{t('team.emailInvalid')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">{t('team.role')}</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}>
                <option value={UserRole.MANAGER}>{t('team.roleManager')}</option>
                <option value={UserRole.STAFF}>{t('team.roleStaff')}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.send_email} onChange={() => setForm(f => ({ ...f, send_email: !f.send_email }))}
                  className="w-4 h-4 accent-indigo-600 rounded" />
                <div>
                  <span className="text-sm font-medium text-surface-700">{t('team.sendCredentials')}</span>
                  <p className="text-xs text-surface-400">{t('team.sendCredentialsDesc')}</p>
                </div>
              </label>
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-surface-100">
              <button type="button" onClick={() => setInviting(false)} className="px-4 py-2 text-surface-600">{t('common.cancel')}</button>
              <button type="submit" className="btn-primary">{t('team.createMember')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Password created modal */}
      {createdPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">{t('team.memberCreated')}</h3>
              <p className="text-sm text-surface-500 mt-1">{t('team.tempPasswordDesc')}</p>
            </div>
            <div className="bg-surface-50 border border-surface-200 dark:border-surface-700 rounded-xl p-4 text-center mb-4">
              <code className="text-xl font-mono font-bold text-indigo-600 tracking-widest select-all">{createdPassword}</code>
              <p className="text-[10px] text-surface-400 mt-2">{t('team.clickToCopy')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700">
                {t('team.passwordWarning')}
              </p>
            </div>
            <button onClick={() => setCreatedPassword(null)} className="btn-primary w-full">
              {t('team.understood')}
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-500 uppercase tracking-wide">
              <th className="px-5 py-3">{t('team.table.name')}</th>
              <th className="px-5 py-3">{t('team.table.email')}</th>
              <th className="px-5 py-3">{t('team.table.role')}</th>
              <th className="px-5 py-3">{t('team.table.status')}</th>
              <th className="px-5 py-3">{t('team.table.joined')}</th>
              {isOwner && <th className="px-5 py-3 text-right">{t('team.table.actions')}</th>}
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
                    <span className="font-medium text-surface-900 dark:text-white">{m.first_name} {m.last_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-surface-600">{m.email}</td>
                <td className="px-5 py-3">
                  {editingId === m.id ? (
                    <select className="input text-xs py-1 w-28" value={editForm.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                      <option value={UserRole.MANAGER}>{t('team.roles.MANAGER')}</option>
                      <option value={UserRole.STAFF}>{t('team.roles.STAFF')}</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge(m.role)}`}>{roleLabel(m.role)}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {isOwner && m.id !== user?.id ? (
                    <button onClick={() => toggleActive(m)}
                      className="flex items-center gap-1.5 group cursor-pointer" title={m.is_active ? t('common.active') : t('common.inactive')}>
                      <span className={`w-2 h-2 rounded-full transition-colors ${m.is_active ? 'bg-green-500 group-hover:bg-red-400' : 'bg-red-500 group-hover:bg-green-400'}`} />
                      <span className="text-sm">{m.is_active ? t('common.active') : t('common.inactive')}</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      {m.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-surface-400">{new Date(m.date_joined).toLocaleDateString('es-EC')}</td>
                {isOwner && (
                  <td className="px-5 py-3 text-right">
                    {m.id === user?.id ? (
                      <span className="text-xs text-surface-400">{t('team.you')}</span>
                    ) : editingId === m.id ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleUpdate(m.id)} className="btn-primary text-xs px-2 py-1">{t('common.save')}</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-2 py-1">{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(m)} className="btn-ghost text-xs px-2 py-1" id={`edit-member-${m.id}`}
                          title={t('team.editRole')}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(m.id, m.email)} className="btn-ghost text-xs px-2 py-1 text-red-500 hover:text-red-700" id={`delete-member-${m.id}`}
                          title={t('common.delete')}>
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
