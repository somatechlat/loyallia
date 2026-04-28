'use client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number, address?: string) => void;
}

/** Click handler component — places marker wherever user clicks */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Flies the map to new coordinates */
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

function LocationPickerInner({ lat, lng, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const markerLat = lat ?? -1.8312;
  const markerLng = lng ?? -78.1834;
  const hasPin = lat !== null && lng !== null;

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  // Debounced Nominatim search
  const doSearch = (query: string) => {
    setSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ec&limit=5`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
  };

  const pickResult = (r: SearchResult) => {
    const rLat = parseFloat(r.lat);
    const rLng = parseFloat(r.lon);
    onChange(rLat, rLng, r.display_name);
    setSearch(r.display_name.split(',')[0]);
    setShowResults(false);
  };

  const handleMapClick = async (cLat: number, cLng: number) => {
    // Reverse geocode to get address
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cLat}&lon=${cLng}&zoom=18`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      onChange(cLat, cLng, data.display_name || '');
    } catch {
      onChange(cLat, cLng);
    }
  };

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
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Buscar dirección en Ecuador..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-200 bg-white/80 backdrop-blur-sm text-sm text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
            />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="spinner w-4 h-4" /></div>}
          </div>
        </div>
        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute z-[1000] w-full mt-1 bg-white rounded-xl border border-surface-200 shadow-lg max-h-[200px] overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 transition-colors border-b border-surface-100 last:border-0">
                <p className="font-medium text-surface-800 truncate">{r.display_name.split(',').slice(0, 2).join(',')}</p>
                <p className="text-xs text-surface-400 truncate">{r.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-[220px] rounded-xl overflow-hidden border border-surface-200/50 relative">
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
          {hasPin && (
            <>
              <Marker position={[markerLat, markerLng]} icon={DefaultIcon}>
                <Popup>
                  <div className="text-xs font-mono">
                    <p>{markerLat.toFixed(6)}, {markerLng.toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
              <FlyTo lat={markerLat} lng={markerLng} />
            </>
          )}
        </MapContainer>
        {/* Coordinates overlay */}
        {hasPin && (
          <div className="absolute bottom-2 left-2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-mono text-surface-600 border border-surface-200/50">
            {markerLat.toFixed(6)}, {markerLng.toFixed(6)}
          </div>
        )}
      </div>

      <p className="text-[10px] text-surface-400">Haz clic en el mapa o busca una dirección para seleccionar la ubicación</p>
    </div>
  );
}

export { LocationPickerInner };
export default LocationPickerInner;
