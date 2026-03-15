/**
 * Dynamic zone pricing: center (premium) 5$/px, middle 2$/px, outer 1$/px.
 * Zones are square rings; grid is 100x100 blocks.
 */
const PIXELS_PER_BLOCK = 100;

/** Zone bounds (inclusive block indices) */
const CENTER_MIN = 40;
const CENTER_MAX = 59;
const MIDDLE_MIN = 25;
const MIDDLE_MAX = 74;

export type Zone = 'center' | 'middle' | 'outer';

export const PRICE_PER_PIXEL: Record<Zone, number> = {
  center: 5,
  middle: 2,
  outer: 1,
};

export function getZone(blockX: number, blockY: number): Zone {
  const inCenter =
    blockX >= CENTER_MIN &&
    blockX <= CENTER_MAX &&
    blockY >= CENTER_MIN &&
    blockY <= CENTER_MAX;
  if (inCenter) return 'center';
  const inMiddle =
    blockX >= MIDDLE_MIN &&
    blockX <= MIDDLE_MAX &&
    blockY >= MIDDLE_MIN &&
    blockY <= MIDDLE_MAX;
  if (inMiddle) return 'middle';
  return 'outer';
}

export function getPricePerPixel(blockX: number, blockY: number): number {
  return PRICE_PER_PIXEL[getZone(blockX, blockY)];
}

/** Total price in dollars for a list of blocks (same logic as backend). */
export function getTotalPriceDollars(blocks: { x: number; y: number }[]): number {
  let total = 0;
  for (const b of blocks) {
    total += getPricePerPixel(b.x, b.y) * PIXELS_PER_BLOCK;
  }
  return total;
}

/** Total in cents for Stripe (integer). */
export function getTotalCents(blocks: { x: number; y: number }[]): number {
  return Math.round(getTotalPriceDollars(blocks) * 100);
}

export function getZoneLabel(zone: Zone): string {
  switch (zone) {
    case 'center':
      return 'Centre (5 $/pixel)';
    case 'middle':
      return 'Milieu (2 $/pixel)';
    case 'outer':
      return 'Périphérie (1 $/pixel)';
  }
}
