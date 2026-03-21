export type PixelAd = {
  id: string;
  start_x: number;
  start_y: number;
  width: number;
  height: number;
  image_url: string | null;
  advertiser_name: string;
  link: string;
  purchase_date: string;
  stripe_payment_id: string;
  approved: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BlockKey = `${number}-${number}`;

export const GRID_SIZE = 1000;
export const BLOCK_SIZE = 10;
export const BLOCKS_PER_SIDE = GRID_SIZE / BLOCK_SIZE; // 100
export const TOTAL_GRID_PIXELS = 1_000_000;

/** Format price for display (summary and CTA must use this for consistency). */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} €`;
}
