'use client';

import { useState, useEffect, useCallback } from 'react';
import { programsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_visits: number;
  total_spent: string;
  last_visit: string | null;
  is_active: boolean;
  enrolled_at: string;
  pass_state: Record<string, unknown>;
}

interface Props {
  programId: string;
  cardType: string;
  onClose: () => void;
}

const LIMIT = 25;

const TX_LABELS: Record<string, string> = {
  stamp: 'Sellos',
  cashback: 'Saldo',
  coupon: 'Cupón usado',
  gift_certificate: 'Saldo regalo',
  vip_membership: 'Membresía',
  multipass: 'Usos restantes',
  discount: 'Descuento',
  affiliate: 'Afiliación',
  corporate_discount: 'Corp.',
  referral_pass: 'Referidos',
};

export default function ProgramMembersModal({ programId, cardType, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await programsApi.members(programId, {
        search: search || undefined,
        limit: LIMIT,
        offset,
      });
      setMembers(data.items);
      setTotal(data.total);
    } catch {
      toast.error('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  }, [programId, search, offset]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  const passStateLabel = (m: Member) => {
    const ps = m.pass_state;
    switch (cardType) {
      case 'stamp':
        return `${ps.stamp_count ?? 0} sellos`;
      case 'cashback':
        return `$${ps.cashback_balance ?? '0.00'}`;
      case 'coupon':
        return ps.coupon_used ? 'Canjeado' : 'Activo';
      case 'gift_certificate':
        return `$${ps.gift_balance ?? '0.00'}`;
      case 'multipass':
        return `${ps.multipass_remaining ?? 0} usos`;
      case 'vip_membership':
        return ps.reward_ready ? 'Recompensa lista' : 'Activo';
      default:
        return 'Activo';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">Miembros Activos</h3>
            <p className="text-sm text-surface-500">{total} miembro{total !== 1 ? 's' : ''} inscrito{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                className="input w-full pr-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <button type="submit" className="btn-secondary text-sm">Buscar</button>
          </form>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-0">
          {loading && members.length === 0 ? (
            <div className="p-8 text-center">
              <div className="spinner w-6 h-6 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Cargando miembros...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <p>No se encontraron miembros</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Contacto</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">{TX_LABELS[cardType] || 'Estado'}</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Visitas</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Gasto total</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Última visita</th>
                  <th className="text-left px-4 py-3 font-semibold text-surface-700 dark:text-surface-300">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-900 dark:text-white">{m.first_name} {m.last_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-surface-600 dark:text-surface-400">{m.email}</div>
                      {m.phone && <div className="text-surface-500 text-xs">{m.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {passStateLabel(m)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{m.total_visits}</td>
                    <td className="px-4 py-3 text-surface-700 dark:text-surface-300">${!isNaN(parseFloat(m.total_spent)) ? parseFloat(m.total_spent).toFixed(2) : '0.00'}</td>
                    <td className="px-4 py-3 text-surface-500">
                      {m.last_visit ? new Date(m.last_visit).toLocaleDateString('es-EC') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {m.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Activo</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400">Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
            <p className="text-sm text-surface-500">
              Mostrando {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setOffset(o => o + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
