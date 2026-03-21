import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PRICE_PER_PIXEL_EURO, PIXELS_PER_BLOCK } from '@/lib/pricing';
import { TOTAL_GRID_PIXELS } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: ads, error } = await supabase
    .from('pixel_ads')
    .select('width, height')
    .eq('approved', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalBlocks = (ads ?? []).reduce((s, a) => s + a.width * a.height, 0);
  const totalPixelsSold = totalBlocks * PIXELS_PER_BLOCK;
  const revenue = totalPixelsSold * PRICE_PER_PIXEL_EURO;
  const advertisersCount = ads?.length ?? 0;
  const pixelsRemaining = Math.max(0, TOTAL_GRID_PIXELS - totalPixelsSold);

  return NextResponse.json({
    totalPixelsSold,
    revenue,
    advertisersCount,
    pixelsRemaining,
    totalBlocks,
  });
}
