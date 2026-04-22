'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  MANAGER: 'Gerente',
  STAFF: 'Personal',
  SUPER_ADMIN: 'Super Admin',
};

interface ProfileModalProps {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant_name: string;
    date_joined: string;
  };
  onClose: () => void;
  onProfileUpdated: () => void;
}

export default function ProfileModal({ user, onClose, onProfileUpdated }: ProfileModalProps) {
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [saving, setSaving] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({ first_name: firstName, last_name: lastName });
      toast.success('Perfil actualizado exitosamente');
      onProfileUpdated();
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async () => {
    if (!currentPw || !newPw) {
      toast.error('Completa ambos campos de contraseña');
      return;
    }
    if (newPw.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword({ current_password: currentPw, new_password: newPw });
      toast.success('Contraseña actualizada exitosamente');
      setShowPwChange(false);
      setCurrentPw('');
      setNewPw('');
    } catch {
      toast.error('Contraseña actual incorrecta');
    } finally {
      setSavingPw(false);
    }
  };

  const joined = new Date(user.date_joined).toLocaleDateString('es-EC', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {(user.first_name?.[0] || '').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">{user.first_name} {user.last_name}</h2>
              <p className="text-white/75 text-sm">{ROLE_LABELS[user.role] || user.role}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          {/* Read-only fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Email</label>
              <div className="text-sm text-surface-700 bg-surface-50 px-3 py-2 rounded-lg border border-surface-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                {user.email}
              </div>
            </div>
            {user.tenant_name && (
              <div>
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Negocio</label>
                <div className="text-sm text-surface-700 bg-surface-50 px-3 py-2 rounded-lg border border-surface-200">
                  {user.tenant_name}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Fecha de registro</label>
              <div className="text-sm text-surface-700 bg-surface-50 px-3 py-2 rounded-lg border border-surface-200">
                {joined}
              </div>
            </div>
          </div>

          {/* Save profile button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving || (firstName === user.first_name && lastName === user.last_name)}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </button>

          {/* Password change section */}
          <div className="border-t border-surface-200 pt-4">
            <button
              onClick={() => setShowPwChange(!showPwChange)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {showPwChange ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>

            {showPwChange && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Contraseña actual</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="input-field w-full"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="input-field w-full"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <button
                  onClick={handleChangePw}
                  disabled={savingPw}
                  className="btn w-full justify-center bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                >
                  {savingPw ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
