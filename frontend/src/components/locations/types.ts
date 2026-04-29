/**
 * Shared types for location components.
 *
 * Extracted from locations/page.tsx as part of LYL-C-FE-002 (mega-component decomposition).
 */

/** Raw location data from the API. */
export interface LocationData {
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

/** Location form data (everything except id). */
export type LocationFormData = Omit<LocationData, 'id'>;

/** Empty form defaults for create mode. */
export const emptyLocation: LocationFormData = {
  name: '',
  address: '',
  city: '',
  country: 'EC',
  latitude: null,
  longitude: null,
  phone: '',
  is_active: true,
  is_primary: false,
};
