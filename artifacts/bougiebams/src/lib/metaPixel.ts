declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Fire a Meta Pixel standard event. Safe no-op when the pixel is blocked
// (ad blockers) or hasn't loaded.
export function trackPixel(event: string, params?: Record<string, unknown>): void {
  try {
    window.fbq?.("track", event, params);
  } catch {
    // never let analytics break the page
  }
}
