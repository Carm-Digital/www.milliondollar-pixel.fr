import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchit la session Supabase (cookies) quand les env sont présents.
 * Ne protège pas les routes — l’admin est vérifié côté API.
 * Garde-fous obligatoires sur Vercel : env manquantes ou erreur réseau = pas de crash middleware.
 */
export async function middleware(request: NextRequest) {
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
