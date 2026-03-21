import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PRICE_PER_PIXEL_EURO, PIXELS_PER_BLOCK } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && user?.email === adminEmail;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data: ads } = await supabase
    .from('pixel_ads')
    .select('id, width, height, purchase_date');

  const totalBlocks = (ads ?? []).reduce((s, a) => s + a.width * a.height, 0);
  const totalPixels = totalBlocks * PIXELS_PER_BLOCK;
  const revenue = totalPixels * PRICE_PER_PIXEL_EURO;

  return NextResponse.json({
    totalAds: ads?.length ?? 0,
    totalBlocks,
    totalPixels,
    revenue,
  });
}
