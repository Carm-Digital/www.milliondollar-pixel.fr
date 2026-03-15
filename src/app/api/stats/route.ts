import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TOTAL_GRID_PIXELS = 1_000_000;
const PRICE_PER_PIXEL = 1;

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
  const totalPixelsSold = totalBlocks * 100;
  const revenue = totalPixelsSold * PRICE_PER_PIXEL;
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
