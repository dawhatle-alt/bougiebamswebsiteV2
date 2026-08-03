import { logger } from "./logger";

// Driving distance lookup via Google Maps. Server-side only — the key must
// never reach the browser, so it's read from GOOGLE_MAPS_API_KEY (no VITE_
// prefix, which would bundle it into the frontend).
//
// Tries the current Routes API first and falls back to the legacy Distance
// Matrix API, so whichever one is enabled on the key works.

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
const METERS_PER_MILE = 1609.344;

export const isDistanceLookupConfigured = (): boolean => API_KEY.trim().length > 0;

const toMiles = (meters: number) => Math.round((meters / METERS_PER_MILE) * 10) / 10;

interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  distanceMeters?: number;
  condition?: string;
}

/** Routes API (current). One origin, many destinations, one request. */
async function viaRoutesApi(origin: string, destinations: string[]): Promise<(number | null)[] | null> {
  try {
    const res = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,condition",
      },
      body: JSON.stringify({
        origins: [{ waypoint: { address: origin } }],
        destinations: destinations.map((address) => ({ waypoint: { address } })),
        travelMode: "DRIVE",
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, body: (await res.text()).slice(0, 300) }, "Routes API distance lookup failed");
      return null;
    }
    const data = (await res.json()) as RouteMatrixElement[];
    if (!Array.isArray(data)) return null;
    const out: (number | null)[] = destinations.map(() => null);
    for (const el of data) {
      const i = el.destinationIndex ?? 0;
      if (el.distanceMeters != null && (el.condition ?? "ROUTE_EXISTS") === "ROUTE_EXISTS") {
        out[i] = toMiles(el.distanceMeters);
      }
    }
    return out;
  } catch (err) {
    logger.warn({ err }, "Routes API distance lookup threw");
    return null;
  }
}

/** Legacy Distance Matrix API — used when only that one is enabled. */
async function viaDistanceMatrix(origin: string, destinations: string[]): Promise<(number | null)[] | null> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", origin);
    url.searchParams.set("destinations", destinations.join("|"));
    url.searchParams.set("units", "imperial");
    url.searchParams.set("key", API_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      rows?: { elements?: { status?: string; distance?: { value?: number } }[] }[];
    };
    if (data.status !== "OK") {
      logger.warn({ status: data.status }, "Distance Matrix lookup returned a non-OK status");
      return null;
    }
    const elements = data.rows?.[0]?.elements ?? [];
    return destinations.map((_, i) => {
      const el = elements[i];
      return el?.status === "OK" && el.distance?.value != null ? toMiles(el.distance.value) : null;
    });
  } catch (err) {
    logger.warn({ err }, "Distance Matrix lookup threw");
    return null;
  }
}

/**
 * One-way driving miles from origin to each destination. Returns nulls (never
 * throws) when the key is missing, an address can't be resolved, or Google is
 * unreachable — the caller falls back to the saved venue distances.
 */
export async function drivingMiles(origin: string, destinations: string[]): Promise<(number | null)[]> {
  const empty = destinations.map(() => null);
  if (!isDistanceLookupConfigured() || !origin.trim() || destinations.length === 0) return empty;

  const routes = await viaRoutesApi(origin, destinations);
  if (routes && routes.some((m) => m != null)) return routes;

  const legacy = await viaDistanceMatrix(origin, destinations);
  if (legacy) return legacy;

  return empty;
}
