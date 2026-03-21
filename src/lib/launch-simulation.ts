/**
 * Launch simulation: baseline stats to show early adoption (22,548 pixels sold).
 * Displayed stats = real stats + simulation (capped so totals stay valid).
 */

export const SIMULATED_PIXELS_SOLD = 22_548;
export const SIMULATED_REVENUE_EURO = 22_548;
export const SIMULATED_ADVERTISERS = 47;
export const TOTAL_GRID_PIXELS = 1_000_000;

/** Seuil affiché : les annonces des acheteurs réels apparaissent sur le mur une fois ce total atteint (stats affichées). */
export const PIXELS_DISPLAY_PURCHASES_THRESHOLD = 50_000;

export function shouldShowPurchasedPixelsOnWall(displayTotalPixelsSold: number): boolean {
  return displayTotalPixelsSold >= PIXELS_DISPLAY_PURCHASES_THRESHOLD;
}

export type DisplayStats = {
  totalPixelsSold: number;
  pixelsRemaining: number;
  revenue: number;
  advertisersCount: number;
};

/** Combine real API stats with simulation for display. Real buyers are added on top. */
export function getDisplayStats(real: {
  totalPixelsSold: number;
  revenue: number;
  advertisersCount: number;
  pixelsRemaining: number;
} | null): DisplayStats {
  const realSold = real?.totalPixelsSold ?? 0;
  const realRevenue = real?.revenue ?? 0;
  const realAdvertisers = real?.advertisersCount ?? 0;
  const totalPixelsSold = Math.min(TOTAL_GRID_PIXELS, realSold + SIMULATED_PIXELS_SOLD);
  const pixelsRemaining = Math.max(0, TOTAL_GRID_PIXELS - totalPixelsSold);
  const revenue = realRevenue + SIMULATED_REVENUE_EURO;
  const advertisersCount = realAdvertisers + SIMULATED_ADVERTISERS;
  return {
    totalPixelsSold,
    pixelsRemaining,
    revenue,
    advertisersCount,
  };
}
