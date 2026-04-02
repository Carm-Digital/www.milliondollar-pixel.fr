import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_GATE_COOKIE, adminGateSecret, verifyAdminGateToken } from '@/lib/admin-gate';

/**
 * Porte /admin : si ADMIN_ACCESS_PASSWORD est défini, cookie httpOnly requis (sauf /admin/connexion).
 * Puis rafraîchit la session Supabase quand les env sont présentes.
 * Garde-fous sur Vercel : env manquantes ou erreur réseau = pas de crash middleware.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const gatePwd = process.env.ADMIN_ACCESS_PASSWORD?.trim();

  if (gatePwd) {
    const gateOpen =
      pathname === '/admin/connexion' ||
      pathname.startsWith('/admin/connexion/') ||
      pathname === '/admin/reinitialiser-mot-de-passe' ||
      pathname.startsWith('/admin/reinitialiser-mot-de-passe/');
    if (pathname.startsWith('/admin') && !gateOpen) {
      const secret = adminGateSecret();
      if (secret) {
        const token = request.cookies.get(ADMIN_GATE_COOKIE)?.value;
        const ok = await verifyAdminGateToken(secret, token);
        if (!ok) {
          return NextResponse.redirect(new URL('/admin/connexion', request.url));
        }
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !anon?.trim()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.getUser();
  } catch {
    // Ne jamais faire échouer le middleware (sinon MIDDLEWARE_INVOCATION_FAILED sur Vercel).
    return NextResponse.next({ request });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
