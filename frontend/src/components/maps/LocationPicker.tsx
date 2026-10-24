'use client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import {
  NOMINATIM_URL,
  NOMINATIM_REVERSE_URL,
  LEAFLET_ICON_URL,
  getMapsConfigError,
  buildNominatimSearchUrl,
  buildNominatimReverseUrl,
} from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

const DefaultIcon = L.icon({
  iconUrl: `${LEAFLET_ICON_URL}/marker-icon.png`,
  iconRetinaUrl: `${LEAFLET_ICON_URL}/marker-icon-2x.png`,
  shadowUrl: `${LEAFLET_ICON_URL}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/** Default map center when no coordinates have been picked yet (Ecuador). */
const DEFAULT_CENTER: [number, number] = [-1.8312, -78.1834];

/**
 * Props for the LocationPicker component.
 */
interface Props {
  /** Current latitude */
  lat: number | null;
  /** Current longitude */
  lng: number | null;
  /** Callback when coordinates or address change */
  onChange: (lat: number, lng: number, address?: string) => void;
}

/**
 * @description Click handler component — places marker wherever user clicks.
 * @param {Object} props - Component props
 * @param {(lat: number, lng: number) => void} props.onPick - Pick handler
 * @returns null
 */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * @description Flies the map to new coordinates.
 * @param {Object} props - Component props
 * @param {number} props.lat - Target latitude
 * @param {number} props.lng - Target longitude
 * @returns null
 */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 16, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

/** Nominatim search results type */
interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * @description Map-based location picker with Nominatim search and reverse geocoding.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
function LocationPickerInner({ lat, lng, onChange }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const markerLat = lat ?? DEFAULT_CENTER[0];
  const markerLng = lng ?? DEFAULT_CENTER[1];
  const hasPin = lat !== null && lng !== null;
  const configError = getMapsConfigError();

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  // Debounced Nominatim search
  const doSearch = (query: string) => {
    setSearch(query);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); setShowResults(false); return; }
    if (configError) {
      // Never fetch a relative URL silently — tell the user what is wrong.
      setResults([]);
      setShowResults(false);
      setSearchError(configError);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = buildNominatimSearchUrl(NOMINATIM_URL, query);
        const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SearchResult[] = await res.json();
        if (!Array.isArray(data)) throw new Error('respuesta inválida');
        setResults(data);
        setShowResults(data.length > 0);
        if (data.length === 0) setSearchError(t('maps.noResults'));
      } catch {
        setResults([]);
        setShowResults(false);
        setSearchError(t('maps.searchError'));
      }
      setSearching(false);
    }, 400);
  };

  const pickResult = (r: SearchResult) => {
    const rLat = parseFloat(r.lat);
    const rLng = parseFloat(r.lon);
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return;
    // Selecting a result always sets lat/lng AND the address.
    onChange(rLat, rLng, r.display_name ?? "");
    setSearch((r.display_name ?? '').split(',')[0] ?? '');
    setShowResults(false);
    setSearchError(null);
  };

  const handleMapClick = async (cLat: number, cLng: number) => {
    if (configError) {
      onChange(cLat, cLng);
      setSearchError(configError);
      return;
    }
    // Reverse geocode to get address
    try {
      const url = buildNominatimReverseUrl(NOMINATIM_REVERSE_URL, cLat, cLng);
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onChange(cLat, cLng, data.display_name || '');
    } catch {
      onChange(cLat, cLng);
      setSearchError(t('maps.reverseError'));
    }
  };

  if (configError) {
    return (
      <div className="space-y-2">
        <div
          role="alert"
          data-testid="maps-config-error"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {t('maps.configError')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => doSearch(e.target.value)}
              onKeyDown={e => {
                // Enter selects the first result: lat/lng + address without a click.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (results.length > 0) pickResult(results[0]!);
                }
              }}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder={t('maps.searchAddress')}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/80 backdrop-blur-sm text-sm text-surface-800 dark:text-surface-100 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
            />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner w-4 h-4" /></div>}
          </div>
        </div>
        {/* Search error / empty-result notice */}
        {searchError && (
          <p role="alert" data-testid="maps-search-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {searchError}
          </p>
        )}
        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute z-[1000] w-full mt-1 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 shadow-lg max-h-[200px] overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors border-b border-surface-100 last:border-0">
                <p className="font-medium text-surface-800 dark:text-surface-100 truncate">{r.display_name.split(',').slice(0, 2).join(',')}</p>
                <p className="text-xs text-surface-400 truncate">{r.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[220px] rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700/50 relative">
        <MapContainer
          center={[markerLat, markerLng]}
          zoom={hasPin ? 15 : 7}
          style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handleMapClick} />
          {/* Always-visible pin: the picked location, or the default center so
              users can see where they are before picking. */}
          <Marker position={[markerLat, markerLng]} icon={DefaultIcon}>
            <Popup>
              <div className="text-xs font-mono">
                {hasPin ? (
                  <p>{markerLat.toFixed(6)}, {markerLng.toFixed(6)}</p>
                ) : (
                  <p data-testid="maps-default-pin">{t('maps.defaultPin')}</p>
                )}
              </div>
            </Popup>
          </Marker>
          {hasPin && <FlyTo lat={markerLat} lng={markerLng} />}
        </MapContainer>
        {/* Coordinates overlay */}
        {hasPin && (
          <div className="absolute bottom-2 left-2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-mono text-surface-600 border border-surface-200 dark:border-surface-700/50">
            {markerLat.toFixed(6)}, {markerLng.toFixed(6)}
          </div>
        )}
      </div>

      <p className="text-[10px] text-surface-400">Haz clic en el mapa o busca una dirección para seleccionar la ubicación</p>
    </div>
  );
}

/**
 * @description Map-based location picker with Nominatim search and reverse geocoding.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
export default LocationPickerInner;
