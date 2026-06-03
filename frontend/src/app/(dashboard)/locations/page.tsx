'use client';

/**
 * Locations management page.
 *
 * Decomposed from a 422-line mega-component (LYL-C-FE-002) into:
 * - LocationCard (grid card display)
 * - LocationForm (create/edit form)
 *
 * Fixes applied:
 * - LYL-H-FE-014: Consistent dark mode classes
 * - LYL-H-FE-013: Keyboard navigation (Escape to close modal)
 * - LYL-M-FE-029: Focus management (trap focus, restore on close)
 * - LYL-M-FE-022: Optimistic updates for toggle active
 * - LYL-M-FE-018: Proper key props
 * - LYL-M-FE-021: Error messages for API failures
 * - LYL-M-FE-024: Ecuador timezone in date display
 * - LYL-L-FE-035: Import ordering (react → next → local)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationCard from '@/components/locations/LocationCard';
import LocationForm from '@/components/locations/LocationForm';
import type { LocationData, LocationFormData } from '@/components/locations/types';
import { emptyLocation } from '@/components/locations/types';

const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });

/** Info row for detail view. */
function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-surface-800 dark:text-surface-200 font-medium">{value}</p>
    </div>
  );
}

/**
 * Locations management page.
 * Displays location cards in a grid with map, stats, and CRUD modals.
 */
export default function LocationsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<LocationData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<LocationFormData>(emptyLocation);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // LYL-M-FE-029: Focus management refs
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

    const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/tenants/locations/');
      setLocations(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      // LYL-M-FE-021: User-friendly error message
      toast.error(t('locations.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadLocations(); }, [loadLocations]);

    const openDetail = useCallback((loc: LocationData) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelectedLoc(loc);
    setEditMode(false);
    setForm({
      name: loc.name, address: loc.address, city: loc.city,
      country: loc.country, latitude: loc.latitude, longitude: loc.longitude,
      phone: loc.phone, is_active: loc.is_active, is_primary: loc.is_primary,
    });
  }, []);

  const openCreate = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setShowCreate(true);
    setForm({ ...emptyLocation });
  }, []);

  const closeModal = useCallback(() => {
    setSelectedLoc(null);
    setShowCreate(false);
    setEditMode(false);
    // LYL-M-FE-029: Restore focus to trigger element
    setTimeout(() => previousFocusRef.current?.focus(), 50);
  }, []);

  // LYL-H-FE-013 + LYL-M-FE-029: Keyboard handlers for modal
  useEffect(() => {
    if (!selectedLoc && !showCreate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      // LYL-M-FE-029: Focus trap — cycle Tab within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus close button on open
    setTimeout(() => closeBtnRef.current?.focus(), 100);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedLoc, showCreate, closeModal]);

    const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (showCreate) {
        await api.post('/api/v1/tenants/locations/', form);
        toast.success(t('locations.created'));
      } else if (selectedLoc) {
        await api.patch(`/api/v1/tenants/locations/${selectedLoc.id}/`, form);
        toast.success(t('locations.updated'));
      }
      closeModal();
      await loadLocations();
    } catch (e: unknown) {
      // LYL-M-FE-021: User-friendly error messages
      const msg = e instanceof Error ? e.message : t('locations.saveError');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [showCreate, selectedLoc, form, closeModal, loadLocations, t]);

  const handleDelete = useCallback(() => {
    if (!selectedLoc) return;
    setShowDeleteConfirm(true);
  }, [selectedLoc]);

  const confirmDelete = useCallback(async () => {
    if (!selectedLoc) return;
    setShowDeleteConfirm(false);
    try {
      await api.delete(`/api/v1/tenants/locations/${selectedLoc.id}/`);
      toast.success(t('locations.deleted'));
      closeModal();
      await loadLocations();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('locations.deleteError');
      toast.error(msg);
    }
  }, [selectedLoc, closeModal, loadLocations, t]);

  /** LYL-M-FE-022: Optimistic update for toggle active state. */
  const handleToggleActive = useCallback(async (loc: LocationData) => {
    const newActive = !loc.is_active;
    // Optimistic update
    setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: newActive } : l));
    if (selectedLoc?.id === loc.id) {
      setSelectedLoc(prev => prev ? { ...prev, is_active: newActive } : prev);
      setForm(f => ({ ...f, is_active: newActive }));
    }

    try {
      await api.patch(`/api/v1/tenants/locations/${loc.id}/`, { is_active: newActive });
      toast.success(newActive ? t('locations.activated') : t('locations.deactivated'));
    } catch {
      // Revert on failure
      setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: !newActive } : l));
      if (selectedLoc?.id === loc.id) {
        setSelectedLoc(prev => prev ? { ...prev, is_active: !newActive } : prev);
        setForm(f => ({ ...f, is_active: !newActive }));
      }
      toast.error(t('locations.statusError'));
    }
  }, [selectedLoc, t]);

    if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 dark:bg-surface-700 rounded-xl w-48" />
        <div className="h-[300px] bg-surface-200 dark:bg-surface-700 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-surface-200 dark:bg-surface-700 rounded-2xl" />)}
        </div>
      </div>
    );
  }

    const mapPins = locations
    .filter(l => l.latitude && l.longitude)
    .map(l => ({
      id: l.id, name: l.name, address: l.address, city: l.city,
      lat: l.latitude!, lng: l.longitude!, is_active: l.is_active,
    }));

  const activeCount = locations.filter(l => l.is_active).length;
  const primaryLoc = locations.find(l => l.is_primary);
  const cities = [...new Set(locations.map(l => l.city).filter(Boolean))];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-surface-900 dark:text-surface-100 tracking-tight">{t('locations.title')}</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">
            {t('locations.subtitle', { count: locations.length, cities: cities.length })} {cities.length === 1 ? t('locations.city') : t('locations.cities')}
            {primaryLoc && <span> — {t('locations.primary')}: <strong>{primaryLoc.name}</strong></span>}
          </p>
        </div>
        {user?.role === UserRole.OWNER && (
          <button onClick={openCreate}
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 dark:shadow-none hover:shadow-brand-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('locations.newLocation')}
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('locations.stats.total'), value: locations.length, color: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' },
          { label: t('locations.stats.active'), value: activeCount, color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
          { label: t('locations.stats.inactive'), value: locations.length - activeCount, color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
          { label: t('locations.stats.cities'), value: cities.length, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-surface-800 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm">
            <p className="text-xs font-medium text-surface-400 dark:text-surface-500">{s.label}</p>
            <p className="text-2xl font-black text-surface-900 dark:text-surface-100 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {mapPins.length > 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-surface-900 dark:text-surface-100">{t('locations.mapTitle')}</h2>
              <p className="text-xs text-surface-400 dark:text-surface-500">{t('locations.gpsLocations', { count: mapPins.length })}</p>
            </div>
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-semibold">
              {cities.join(' · ')}
            </span>
          </div>
          <div className="h-[350px]">
            <LocationMap locations={mapPins} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <LocationCard key={loc.id} location={loc} onClick={openDetail} />
        ))}
      </div>

      {locations.length === 0 && (
        <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-16 text-center">
          <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-300 dark:text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-surface-500 dark:text-surface-400">{t('locations.noLocations')}</p>
          <p className="text-surface-400 dark:text-surface-500 text-sm mt-1">{t('locations.createFirstLocation')}</p>
        </div>
      )}


      {(selectedLoc || showCreate) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={showCreate ? t('locations.newLocation') : editMode ? t('locations.editLocation') : selectedLoc?.name}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal panel — LYL-M-FE-029: ref for focus trap */}
          <div
            ref={modalRef}
            className="relative w-full max-w-lg bg-white/80 dark:bg-surface-800/90 backdrop-blur-xl border border-white/30 dark:border-surface-600/30 rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.1)' }}
          >
            {/* Header gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-brand-600" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-surface-900 dark:text-surface-100">
                  {showCreate ? t('locations.newLocation') : editMode ? t('locations.editLocation') : selectedLoc?.name}
                </h2>
                {!showCreate && !editMode && selectedLoc && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selectedLoc.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-xs text-surface-400 dark:text-surface-500">{selectedLoc.is_active ? t('locations.activeLocation') : t('locations.inactiveLocation')}</span>
                    {selectedLoc.is_primary && (
                      <span className="text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {t('locations.primaryLabel')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                ref={closeBtnRef}
                onClick={closeModal}
                aria-label={t('locations.closeModal')}
                className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <svg className="w-4 h-4 text-surface-500 dark:text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

  
            {selectedLoc && !editMode && !showCreate && (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label={t('locations.address')} value={selectedLoc.address || '—'} full />
                  <InfoRow label={t('locations.cityLabel')} value={selectedLoc.city || '—'} />
                  <InfoRow label={t('locations.country')} value={selectedLoc.country === 'EC' ? '🇪🇨 Ecuador' : selectedLoc.country} />
                  <InfoRow label={t('customers.phone')} value={selectedLoc.phone || '—'} />
                  <InfoRow label={t('common.status')} value={selectedLoc.is_active ? t('locations.activeLocation') : t('locations.inactiveLocation')} />
                </div>

                {/* GPS */}
                {selectedLoc.latitude && selectedLoc.longitude && (
                  <div className="bg-surface-50/80 dark:bg-surface-700/50 backdrop-blur-sm rounded-2xl p-4 border border-surface-200 dark:border-surface-700/50 dark:border-surface-600/50">
                    <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-2">{t('locations.gpsCoordinates')}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-surface-700 dark:text-surface-300">{selectedLoc.latitude.toFixed(6)}</span>
                      <span className="text-surface-300 dark:text-surface-600">,</span>
                      <span className="font-mono text-sm text-surface-700 dark:text-surface-300">{selectedLoc.longitude.toFixed(6)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLoc.latitude},${selectedLoc.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-semibold mt-2 inline-block"
                    >
                      {t('locations.openInMaps')}
                    </a>
                  </div>
                )}

                {/* Mini map */}
                {selectedLoc.latitude && selectedLoc.longitude && (
                  <div className="rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700/50 dark:border-surface-600/50 h-[180px]">
                    <LocationMap
                      locations={[{ id: selectedLoc.id, name: selectedLoc.name, lat: selectedLoc.latitude, lng: selectedLoc.longitude }]}
                      center={[selectedLoc.latitude, selectedLoc.longitude]}
                      zoom={15}
                    />
                  </div>
                )}

                {/* Action buttons */}
                {user?.role === UserRole.OWNER && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditMode(true)}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 dark:shadow-none">
                      <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg> {t('common.edit')}
                    </button>
                    <button onClick={() => handleToggleActive(selectedLoc)}
                      aria-label={selectedLoc.is_active ? t('locations.inactiveLocation') : t('locations.activeLocation')}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        selectedLoc.is_active
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800'
                      }`}>
                      {selectedLoc.is_active ? t('common.inactive') : t('common.active')}
                    </button>
                    <button onClick={handleDelete}
                      aria-label={t('locations.deleteTitle')}
                      className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 transition-all">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

  
            {(editMode || showCreate) && (
              <LocationForm
                form={form}
                onChange={setForm}
                onSave={handleSave}
                onCancel={closeModal}
                saving={saving}
                isCreate={showCreate}
              />
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedLoc && (
        <ConfirmModal
          title={t('locations.deleteTitle')}
          message={t('locations.deleteConfirm', { name: selectedLoc.name })}
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
