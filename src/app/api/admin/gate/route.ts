import { NextResponse } from 'next/server';
import {
  ADMIN_GATE_COOKIE,
  adminGateSecret,
  createAdminGateToken,
} from '@/lib/admin-gate';

export async function POST(request: Request) {
  const gatePwd = process.env.ADMIN_ACCESS_PASSWORD?.trim();
  if (!gatePwd) {
    return NextResponse.json(
      { error: 'ADMIN_ACCESS_PASSWORD non configuré sur le serveur.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? String((body as { password: unknown }).password)
      : '';

  if (password !== gatePwd) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  }

  const secret = adminGateSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Configuration gate invalide.' }, { status: 503 });
  }

  const token = await createAdminGateToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
