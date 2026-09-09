/**
 * Parse latitude and longitude from a Google Maps URL.
 *
 * Supports all common formats:
 * - https://maps.google.com/?q=-2.1543,-79.8963
 * - https://www.google.com/maps/place/.../@-2.1543,-79.8963,17z
 * - https://goo.gl/maps/XXXXX (shortened — cannot parse, returns null)
 * - https://maps.app.goo.gl/XXXXX (shortened — cannot parse, returns null)
 * - https://www.google.com/maps/search/?api=1&query=-2.1543,-79.8963
 *
 * @param url - Google Maps URL string
 * @returns { lat, lng } or null if coordinates cannot be extracted
 */
export function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Reject shortened URLs that can't be parsed client-side
  if (/goo\.gl|maps\.app\.goo\.gl/i.test(trimmed)) {
    return null;
  }

  // Pattern 1: @lat,lng in the URL path (most common for full URLs)
  // e.g. /@-2.1543,-79.8963,17z
  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]!);
    const lng = parseFloat(atMatch[2]!);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Pattern 2: q=lat,lng or query=lat,lng parameter
  // e.g. ?q=-2.1543,-79.8963 or ?query=-2.1543,-79.8963
  try {
    const urlObj = new URL(trimmed);
    for (const param of ['q', 'query']) {
      const val = urlObj.searchParams.get(param);
      if (val) {
        const coords = parseCoordPair(val);
        if (coords) return coords;
      }
    }
  } catch {
    // Not a valid URL — try regex fallback
  }

  // Pattern 3: !3d and !4d encoded in data parameter
  // e.g. ...!3d-2.1543!4d-79.8963
  const d3Match = trimmed.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (d3Match) {
    const lat = parseFloat(d3Match[1]!);
    const lng = parseFloat(d3Match[2]!);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Pattern 4: plain coordinates in the URL
  // e.g. -2.1543,-79.8963
  const plainMatch = trimmed.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]!);
    const lng = parseFloat(plainMatch[2]!);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  return null;
}

/** Parse "lat,lng" from a string like "-2.1543,-79.8963" */
function parseCoordPair(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]!);
  const lng = parseFloat(parts[1]!);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (!isValidCoords(lat, lng)) return null;
  return { lat, lng };
}

function isValidCoords(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
