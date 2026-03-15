import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;

  if (!file || !name) {
    return NextResponse.json(
      { error: 'Missing file or name' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const ext = file.name.split('.').pop() || 'png';
  const path = `ads/${Date.now()}-${name.replace(/\s+/g, '-').slice(0, 30)}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('ad-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from('ad-images')
    .getPublicUrl(uploadData.path);

  return NextResponse.json({ url: urlData.publicUrl, path: uploadData.path });
}
