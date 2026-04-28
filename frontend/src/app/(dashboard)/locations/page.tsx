'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

const LocationMap = dynamic(() => import('@/components/maps/LocationMap'), { ssr: false });

interface LocationData {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  is_active: boolean;
  is_primary: boolean;
}

const emptyLocation: Omit<LocationData, 'id'> = {
  name: '', address: '', city: '', country: 'EC',
  latitude: null, longitude: null, phone: '',
  is_active: true, is_primary: false,
};

const api = (path: string, opts?: RequestInit) => {
  const token = Cookies.get('access_token');
  return fetch(`/api/v1/tenants${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
  });
};

export default function LocationsPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<LocationData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Omit<LocationData, 'id'>>(emptyLocation);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/locations/');
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : data?.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  /* ── Detail Modal ── */
  const openDetail = (loc: LocationData) => {
    setSelectedLoc(loc);
    setEditMode(false);
    setForm({
      name: loc.name, address: loc.address, city: loc.city,
      country: loc.country, latitude: loc.latitude, longitude: loc.longitude,
      phone: loc.phone, is_active: loc.is_active, is_primary: loc.is_primary,
    });
  };

  const openCreate = () => {
    setShowCreate(true);
    setForm({ ...emptyLocation });
  };

  const closeModal = () => { setSelectedLoc(null); setShowCreate(false); setEditMode(false); };

  /* ── Save/Update ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      if (showCreate) {
        const res = await api('/locations/', { method: 'POST', body: JSON.stringify(form) });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Sucursal creada exitosamente');
      } else if (selectedLoc) {
        const res = await api(`/locations/${selectedLoc.id}/`, { method: 'PATCH', body: JSON.stringify(form) });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Sucursal actualizada');
      }
      closeModal();
      await loadLocations();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedLoc) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedLoc) return;
    setShowDeleteConfirm(false);
    try {
      const res = await api(`/locations/${selectedLoc.id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Sucursal eliminada');
      closeModal();
      await loadLocations();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
  };

  const handleToggleActive = async (loc: LocationData) => {
    try {
      await api(`/locations/${loc.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !loc.is_active }),
      });
      toast.success(loc.is_active ? 'Sucursal desactivada' : 'Sucursal activada');
      await loadLocations();
    } catch { toast.error('Error al cambiar estado'); }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-xl w-48" />
        <div className="h-[300px] bg-surface-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-surface-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const mapPins = locations.filter(l => l.latitude && l.longitude).map(l => ({
    id: l.id, name: l.name, address: l.address, city: l.city,
    lat: l.latitude!, lng: l.longitude!, is_active: l.is_active,
  }));

  const activeCount = locations.filter(l => l.is_active).length;
  const primaryLoc = locations.find(l => l.is_primary);
  const cities = [...new Set(locations.map(l => l.city).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-surface-900 tracking-tight">Sucursales</h1>
          <p className="text-surface-500 mt-1">
            {locations.length} ubicaciones en {cities.length} {cities.length === 1 ? 'ciudad' : 'ciudades'}
            {primaryLoc && <span> — Principal: <strong>{primaryLoc.name}</strong></span>}
          </p>
        </div>
        {user?.role === 'OWNER' && (
          <button onClick={openCreate}
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200 hover:shadow-brand-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Sucursal
          </button>
        )}
      </header>

      {/* Stats ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: locations.length, color: 'bg-brand-50 text-brand-600' },
          { label: 'Activas', value: activeCount, color: 'bg-green-50 text-green-600' },
          { label: 'Inactivas', value: locations.length - activeCount, color: 'bg-red-50 text-red-600' },
          { label: 'Ciudades', value: cities.length, color: 'bg-purple-50 text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
            <p className="text-xs font-medium text-surface-400">{s.label}</p>
            <p className="text-2xl font-black text-surface-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      {mapPins.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-surface-900">Mapa de Sucursales</h2>
              <p className="text-xs text-surface-400">{mapPins.length} ubicaciones con GPS</p>
            </div>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
              {cities.join(' · ')}
            </span>
          </div>
          <div className="h-[350px]">
            <LocationMap locations={mapPins} />
          </div>
        </div>
      )}

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <div key={loc.id}
            onClick={() => openDetail(loc)}
            className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${loc.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
              <h3 className="font-bold text-surface-900 group-hover:text-brand-600 transition-colors truncate">{loc.name}</h3>
              {loc.is_primary && (
                <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold ml-auto flex-shrink-0">
                  ★ Principal
                </span>
              )}
            </div>
            <p className="text-sm text-surface-600 truncate">{loc.address || '—'}</p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-surface-400">{loc.city}, Ecuador</p>
              {loc.latitude && loc.longitude && (
                <p className="text-[10px] text-surface-300 font-mono">
                  {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                </p>
              )}
            </div>
            {loc.phone && (
              <p className="text-xs text-surface-400 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {loc.phone}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-brand-500 font-semibold">Ver detalles →</span>
            </div>
          </div>
        ))}
      </div>

      {locations.length === 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="text-surface-500">No hay sucursales registradas.</p>
          <p className="text-surface-400 text-sm mt-1">Crea tu primera sucursal con el botón de arriba.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* GLASSMORPHISM DETAIL / EDIT / CREATE MODAL                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {(selectedLoc || showCreate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.1)' }}
          >
            {/* Header gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-brand-400 via-purple-400 to-brand-600" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-surface-900">
                  {showCreate ? 'Nueva Sucursal' : editMode ? 'Editar Sucursal' : selectedLoc?.name}
                </h2>
                {!showCreate && !editMode && selectedLoc && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selectedLoc.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-xs text-surface-400">{selectedLoc.is_active ? 'Activa' : 'Inactiva'}</span>
                    {selectedLoc.is_primary && (
                      <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">★ Principal</span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-xl bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* ── READ MODE ── */}
            {selectedLoc && !editMode && !showCreate && (
              <div className="px-6 pb-6 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Dirección" value={selectedLoc.address || '—'} full />
                  <InfoRow label="Ciudad" value={selectedLoc.city || '—'} />
                  <InfoRow label="País" value={selectedLoc.country === 'EC' ? '🇪🇨 Ecuador' : selectedLoc.country} />
                  <InfoRow label="Teléfono" value={selectedLoc.phone || '—'} />
                  <InfoRow label="Estado" value={selectedLoc.is_active ? 'Activa' : 'Inactiva'} />
                </div>

                {/* GPS */}
                {selectedLoc.latitude && selectedLoc.longitude && (
                  <div className="bg-surface-50/80 backdrop-blur-sm rounded-2xl p-4 border border-surface-200/50">
                    <p className="text-xs font-semibold text-surface-500 mb-2">Coordenadas GPS</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-surface-700">{selectedLoc.latitude.toFixed(6)}</span>
                      <span className="text-surface-300">,</span>
                      <span className="font-mono text-sm text-surface-700">{selectedLoc.longitude.toFixed(6)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLoc.latitude},${selectedLoc.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-500 hover:text-brand-600 font-semibold mt-2 inline-block"
                    >
                      Abrir en Google Maps ↗
                    </a>
                  </div>
                )}

                {/* Mini map */}
                {selectedLoc.latitude && selectedLoc.longitude && (
                  <div className="rounded-2xl overflow-hidden border border-surface-200/50 h-[180px]">
                    <LocationMap
                      locations={[{ id: selectedLoc.id, name: selectedLoc.name, lat: selectedLoc.latitude, lng: selectedLoc.longitude }]}
                      center={[selectedLoc.latitude, selectedLoc.longitude]}
                      zoom={15}
                    />
                  </div>
                )}

                {/* Action buttons */}
                {user?.role === 'OWNER' && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditMode(true)}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200">
                      <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                    </button>
                    <button onClick={() => handleToggleActive(selectedLoc)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        selectedLoc.is_active
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      }`}>
                      {selectedLoc.is_active ? (<><svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Desactivar</>) : (<><svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Activar</>)}
                    </button>
                    <button onClick={handleDelete}
                      className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── EDIT / CREATE MODE ── */}
            {(editMode || showCreate) && (
              <div className="px-6 pb-6 space-y-3">
                <FormField label="Nombre" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ej: Mall del Sol" />
                <FormField label="Dirección" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Av. 9 de Octubre 424" />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Ciudad" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="Guayaquil" />
                  <FormField label="Teléfono" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+593 4 268 3200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Latitud" value={form.latitude?.toString() || ''} onChange={v => setForm(f => ({ ...f, latitude: v ? parseFloat(v) : null }))} placeholder="-2.1543" />
                  <FormField label="Longitud" value={form.longitude?.toString() || ''} onChange={v => setForm(f => ({ ...f, longitude: v ? parseFloat(v) : null }))} placeholder="-79.8963" />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_primary}
                      onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400" />
                    <span className="text-sm text-surface-700 font-medium">Sede principal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-surface-300 text-green-500 focus:ring-green-400" />
                    <span className="text-sm text-surface-700 font-medium">Activa</span>
                  </label>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-3">
                  <button onClick={handleSave} disabled={saving || !form.name.trim()}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-brand-200">
                    {saving ? 'Guardando...' : showCreate ? 'Crear Sucursal' : 'Guardar Cambios'}
                  </button>
                  <button onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-surface-100 text-surface-600 hover:bg-surface-200 transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedLoc && (
        <ConfirmModal
          title="Eliminar sucursal"
          message={`¿Eliminar "${selectedLoc.name}" permanentemente? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-surface-800 font-medium">{value}</p>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-surface-500 mb-1 block">{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white/60 backdrop-blur-sm text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
      />
    </div>
  );
}
