'use client';
import { useState, useEffect } from 'react';
import { customersApi, programsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { use } from 'react';

interface Program {
  id: string;
  name: string;
  is_active: boolean;
}

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const [customer, setCustomer] = useState<any>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('');

  const loadData = () => {
    Promise.all([
      customersApi.get(id),
      customersApi.passes(id)
    ])
      .then(([custRes, passRes]) => {
        setCustomer(custRes.data);
        setPasses(Array.isArray(passRes.data) ? passRes.data : passRes.data.passes || []);
      })
      .catch((e) => {
        console.error(e);
        toast.error('Error al cargar perfil de cliente');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const openEnrollModal = async () => {
    try {
      const { data } = await programsApi.list();
      const activePrograms = (data.programs || []).filter((p: Program) => p.is_active);
      setPrograms(activePrograms);
      
      const enrolledCardIds = passes.map(p => p.card?.id);
      const availablePrograms = activePrograms.filter((p: Program) => !enrolledCardIds.includes(p.id));
      setPrograms(availablePrograms);
      
      if (availablePrograms.length > 0) {
        setSelectedProgram(availablePrograms[0].id);
      }
      setShowEnrollModal(true);
    } catch {
      toast.error('Error al cargar programas');
    }
  };

  const handleEnroll = async () => {
    if (!selectedProgram) {
      toast.error('Selecciona un programa');
      return;
    }
    
    setEnrolling(true);
    try {
      await customersApi.enroll(id, selectedProgram);
      toast.success('Cliente inscrito exitosamente');
      setShowEnrollModal(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al inscribir cliente';
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Cargando perfil...</div>;
  if (!customer) return <div className="p-8 text-center text-red-500">Cliente no encontrado.</div>;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <a href="/customers" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Volver a Clientes
      </a>

      <div className="page-header flex justify-between items-center bg-surface-50 p-6 rounded-2xl border border-surface-200">
        <div>
          <h1 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h1>
          <p className="text-surface-500 mt-1">{customer.email} • {customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-surface-400">Total Gastado</p>
          <p className="text-2xl font-black text-emerald-600">${customer.total_spent ?? '0.00'}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Pases Activos / Billeteras ({passes.length})</h2>
        <button onClick={openEnrollModal} className="btn-primary text-sm" id="enroll-customer-btn">
          + Inscribir en Programa
        </button>
      </div>
      
      {passes.length === 0 ? (
        <div className="card p-10 text-center text-surface-400">Este cliente no está inscrito en ningún programa.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passes.map((p) => (
            <div key={p.id} className="card p-5 border-l-4" style={{ borderColor: '#6366f1' }}>
               <h3 className="font-semibold text-lg">{p.card_name || 'Programa'}</h3>
               <p className="text-xs text-surface-400 mt-1 uppercase">{p.card_type || 'unknown'}</p>
               <div className="mt-4 pt-4 border-t border-surface-100 flex justify-between">
                  <span className="text-sm">Inscrito: {new Date(p.enrolled_at).toLocaleDateString()}</span>
                  <span className="badge-green">Activo</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Inscribir en Programa</h3>
            
            {programs.length === 0 ? (
              <p className="text-surface-500">No hay programas disponibles o el cliente ya está inscrito en todos.</p>
            ) : (
              <div className="mb-4">
                <label className="label">Seleccionar Programa</label>
                <select 
                  className="input"
                  value={selectedProgram}
                  onChange={e => setSelectedProgram(e.target.value)}
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEnrollModal(false)}
                className="btn-secondary flex-1"
                disabled={enrolling}
              >
                Cancelar
              </button>
              <button 
                onClick={handleEnroll}
                className="btn-primary flex-1"
                disabled={enrolling || programs.length === 0}
              >
                {enrolling ? 'Inscribiendo...' : 'Inscribir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
