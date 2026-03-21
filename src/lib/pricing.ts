/**
 * Fixed pricing: 1 € per pixel, 100 € per 10×10 block.
 * Wall = 1000×1000 pixels = 1 000 000 pixels = 1 000 000 € total value.
 * Grid = 100×100 blocks = 10 000 blocks → 10 000 × 100 € = 1 000 000 €.
 */
export const PIXELS_PER_BLOCK = 100;
export const PRICE_PER_PIXEL_EURO = 1;
export const PRICE_PER_BLOCK_EURO = PIXELS_PER_BLOCK * PRICE_PER_PIXEL_EURO; // 100 €

/** Total blocks on the wall (100×100). */
export const TOTAL_GRID_BLOCKS = 10_000;
/** Full wall value in euros. Must equal TOTAL_GRID_BLOCKS * PRICE_PER_BLOCK_EURO. */
export const TOTAL_WALL_EUROS = TOTAL_GRID_BLOCKS * PRICE_PER_BLOCK_EURO; // 1 000 000 €

/** Total price in euros for a list of blocks. 1 block = 100 €. */
export function getTotalPriceDollars(blocks: { x: number; y: number }[]): number {
  return blocks.length * PRICE_PER_BLOCK_EURO;
}

/** Total in cents for Stripe (integer). */
export function getTotalCents(blocks: { x: number; y: number }[]): number {
  return blocks.length * PRICE_PER_BLOCK_EURO * 100;
}

/** Pixel count for a list of blocks. */
export function getPixelCount(blocks: { x: number; y: number }[]): number {
  return blocks.length * PIXELS_PER_BLOCK;
}
