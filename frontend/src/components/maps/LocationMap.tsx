'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { LEAFLET_ICON_URL } from '@/lib/constants';

// Fix Leaflet default icon issue in Next.js/Webpack
const DefaultIcon = L.icon({
  iconUrl: `${LEAFLET_ICON_URL}/marker-icon.png`,
  iconRetinaUrl: `${LEAFLET_ICON_URL}/marker-icon-2x.png`,
  shadowUrl: `${LEAFLET_ICON_URL}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/**
 * Represents a location pin on the Leaflet map.
 */
interface LocationPin {
  id: string;
  name: string;
  tenant_name?: string;
  address?: string;
  city?: string;
  phone?: string;
  industry?: string;
  user_count?: number;
  lat: number;
  lng: number;
  is_active?: boolean;
  is_primary?: boolean;
}

/**
 * Props for the LocationMap component.
 */
interface Props {
  /** Array of location pins to display */
  locations: LocationPin[];
  /** Optional map center coordinates */
  center?: [number, number];
  /** Optional zoom level */
  zoom?: number;
}

/**
 * @description Leaflet map component that renders location pins with popups.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
function LocationMapInner({ locations, center, zoom }: Props) {
  useEffect(() => {
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  if (!locations || locations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-50 text-surface-400">
        <p className="text-sm">Sin ubicaciones registradas</p>
      </div>
    );
  }

  // Auto-center on data
  const avgLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
  const avgLng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;
  const finalCenter = center || [avgLat, avgLng] as [number, number];
  const finalZoom = zoom || (locations.length > 10 ? 7 : 10);

  return (
    <MapContainer
      center={finalCenter}
      zoom={finalZoom}
      style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={DefaultIcon}>
          <Popup>
            <div style={{ minWidth: '180px', fontFamily: 'Inter, system-ui, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: loc.is_active !== false ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                <strong style={{ fontSize: '13px', color: '#1a1a2e' }}>{loc.name}</strong>
                {loc.is_primary && <span style={{ fontSize: '9px', background: '#ede9fe', color: '#7c3aed', padding: '1px 5px', borderRadius: '8px', fontWeight: 600 }}>Principal</span>}
              </div>
              {loc.tenant_name && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>{loc.tenant_name}</p>}
              {loc.address && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0', lineHeight: '1.3' }}>{loc.address}</p>}
              {loc.city && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px 0' }}>{loc.city}, Ecuador</p>}
              {loc.phone && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px 0' }}>Tel: {loc.phone}</p>}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f3f4f6' }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '10px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
                >
                  Cómo llegar →
                </a>
                <span style={{ fontSize: '10px', color: '#d1d5db' }}>|</span>
                <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/**
 * @description Leaflet map component that renders location pins with popups.
 * Named export for dynamic import resolution.
 */
export { LocationMapInner };

/**
 * @description Leaflet map component that renders location pins with popups.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
export default LocationMapInner;
