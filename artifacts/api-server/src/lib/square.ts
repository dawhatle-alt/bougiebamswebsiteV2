const SQUARE_BASE = "https://connect.squareup.com";
const SQUARE_VERSION = "2025-04-16";

export function getSquareToken(): string | null {
  return process.env.SQUARE_ACCESS_TOKEN || null;
}

export class SquareError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SquareError";
    this.status = status;
    this.body = body;
  }
}

export async function squareFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getSquareToken();
  if (!token) {
    throw new SquareError("Square is not configured", 503, null);
  }

  const res = await fetch(`${SQUARE_BASE}${path}`, {
    ...init,
    headers: {
      "Square-Version": SQUARE_VERSION,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new SquareError(
      `Square request failed: ${path}`,
      res.status,
      body,
    );
  }

  return body as T;
}

let cachedLocationId: string | null = null;

export async function getLocationId(): Promise<string> {
  if (cachedLocationId) return cachedLocationId;
  const data = await squareFetch<{ locations?: Array<{ id: string; status: string }> }>(
    "/v2/locations",
  );
  const locations = data.locations || [];
  const active = locations.find((l) => l.status === "ACTIVE") || locations[0];
  if (!active) {
    throw new SquareError("No Square location available", 503, null);
  }
  cachedLocationId = active.id;
  return cachedLocationId;
}
