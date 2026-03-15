import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature' },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { start_x, start_y, width, height, advertiser_name, link, image_url } = session.metadata ?? {};

  if (!start_x || !start_y || !width || !height || !advertiser_name || !link) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
  }

  const paymentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id ?? session.id;

  const supabase = createServiceClient();
  const { error } = await supabase.from('pixel_ads').insert({
    start_x: parseInt(start_x, 10),
    start_y: parseInt(start_y, 10),
    width: parseInt(width, 10),
    height: parseInt(height, 10),
    image_url: image_url || null,
    advertiser_name,
    link,
    stripe_payment_id: paymentId,
    approved: true,
  });

  if (error) {
    console.error('Webhook insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
