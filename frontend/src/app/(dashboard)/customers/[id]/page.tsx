'use client';
import { useState, useEffect } from 'react';
import { customersApi, programsApi } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Program {
  id: string;
  name: string;
  is_active: boolean;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_spent: string;
  total_visits: number;
  is_active: boolean;
  created_at: string;
}

interface Pass {
  id: string;
  card_name: string;
  card_type: string;
  enrolled_at: string;
  card?: { id: string };
}

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { t } = useI18n();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
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
      .catch(() => {
        toast.error(t('customers.loadProfileError'));
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
      
      const enrolledCardIds = passes.map(p => p.card?.id).filter((id): id is string => id !== undefined);
      const availablePrograms = activePrograms.filter((p: Program) => !enrolledCardIds.includes(p.id));
      setPrograms(availablePrograms);
      
      if (availablePrograms.length > 0) {
        setSelectedProgram(availablePrograms[0].id);
      }
      setShowEnrollModal(true);
    } catch {
      toast.error(t('customers.loadProgramsError'));
    }
  };

  const handleEnroll = async () => {
    if (!selectedProgram) {
      toast.error(t('customers.selectProgramError'));
      return;
    }
    
    setEnrolling(true);
    try {
      await customersApi.enroll(id, selectedProgram);
      toast.success(t('customers.enrollSuccess'));
      setShowEnrollModal(false);
      loadData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t('customers.enrollError');
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">{t('customers.loadingProfile')}</div>;
  if (!customer) return <div className="p-8 text-center text-red-500">{t('customers.customerNotFound')}</div>;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <a href="/customers" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        {t('customers.backToCustomers')}
      </a>

      <div className="page-header flex justify-between items-center bg-surface-50 p-6 rounded-2xl border border-surface-200 dark:border-surface-700">
        <div>
          <h1 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h1>
          <p className="text-surface-500 mt-1">{customer.email} • {customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-surface-400">{t('customers.totalSpent')}</p>
          <p className="text-2xl font-black text-emerald-600">${customer.total_spent ?? '0.00'}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('customers.activePassesWallets')} ({passes.length})</h2>
        {isOwner ? (
          <button onClick={openEnrollModal} className="btn-primary text-sm" id="enroll-customer-btn">
            {t('customers.enrollInProgram')}
          </button>
        ) : (
          <span className="px-2 py-1 rounded-full bg-surface-100 text-surface-500 text-xs font-medium">{t('customers.readOnly')}</span>
        )}
      </div>
      
      {passes.length === 0 ? (
        <div className="card p-10 text-center text-surface-400">{t('customers.noEnrollments')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passes.map((p) => (
            <div key={p.id} className="card p-5 border-l-4" style={{ borderColor: '#6366f1' }}>
               <h3 className="font-semibold text-lg">{p.card_name || t('customers.program')}</h3>
               <p className="text-xs text-surface-400 mt-1 uppercase">{p.card_type || t('common.unknown')}</p>
               <div className="mt-4 pt-4 border-t border-surface-100 flex justify-between">
                  <span className="text-sm">{t('customers.enrolledAt', { date: new Date(p.enrolled_at).toLocaleDateString() })}</span>
                  <span className="badge-green">{t('common.active')}</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{t('customers.enrollModalTitle')}</h3>
            
            {programs.length === 0 ? (
              <p className="text-surface-500">{t('customers.noProgramsAvailable')}</p>
            ) : (
              <div className="mb-4">
                <label className="label">{t('customers.selectProgramLabel')}</label>
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
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleEnroll}
                className="btn-primary flex-1"
                disabled={enrolling || programs.length === 0}
              >
                {enrolling ? t('customers.enrolling') : t('customers.enroll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
