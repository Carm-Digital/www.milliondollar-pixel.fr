import { createServiceClient } from '@/lib/supabase/server';
import { BLOCKS_PER_SIDE } from '@/types/database';
import { getTotalCents, PIXELS_PER_BLOCK } from '@/lib/pricing';
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function blocksOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
) {
  return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blocks, advertiser_name, link, image_url } = body as {
      blocks: { x: number; y: number }[];
      advertiser_name: string;
      link: string;
      image_url: string;
    };

    if (!blocks?.length || !advertiser_name?.trim() || !link?.trim()) {
      return NextResponse.json(
        { error: 'Missing blocks, advertiser_name, or link' },
        { status: 400 }
      );
    }

    const minX = Math.min(...blocks.map((b) => b.x));
    const minY = Math.min(...blocks.map((b) => b.y));
    const maxX = Math.max(...blocks.map((b) => b.x));
    const maxY = Math.max(...blocks.map((b) => b.y));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    const expectedBlocks = width * height;
    if (blocks.length !== expectedBlocks) {
      return NextResponse.json(
        { error: 'Selection must be a rectangle' },
        { status: 400 }
      );
    }

    if (minX < 0 || minY < 0 || maxX >= BLOCKS_PER_SIDE || maxY >= BLOCKS_PER_SIDE) {
      return NextResponse.json(
        { error: 'Blocks out of grid bounds' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from('pixel_ads')
      .select('start_x, start_y, width, height');

    for (const ad of existing ?? []) {
      if (blocksOverlap(minX, minY, width, height, ad.start_x, ad.start_y, ad.width, ad.height)) {
        return NextResponse.json(
          { error: 'Selected region overlaps with an existing ad' },
          { status: 409 }
        );
      }
    }

    const pixelCount = blocks.length * PIXELS_PER_BLOCK;
    const totalCents = getTotalCents(blocks);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${width * 10}x${height * 10} Pixel Ad · ${totalCents / 100} €`,
              description: `Tarif : 1 €/pixel. ${blocks.length} bloc(s) = ${pixelCount.toLocaleString('fr-FR')} pixels = ${totalCents / 100} € · ${advertiser_name}`,
              images: image_url ? [image_url] : undefined,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/?success=1`,
      cancel_url: `${request.nextUrl.origin}/?cancel=1`,
      metadata: {
        start_x: String(minX),
        start_y: String(minY),
        width: String(width),
        height: String(height),
        advertiser_name: advertiser_name.slice(0, 200),
        link: link.slice(0, 500),
        image_url: image_url?.slice(0, 500) ?? '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
