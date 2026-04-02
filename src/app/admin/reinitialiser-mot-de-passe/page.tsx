'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const t = window.setTimeout(async () => {
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (!cancelled && s2) setReady(true);
    }, 500);

    void (async () => {
      const code = searchParams.get('code');
      if (code) {
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (ex) {
          setError(ex.message);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setReady(true);
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === 'PASSWORD_RECOVERY' || session) {
          setReady(true);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      unsubscribe?.();
    };
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: up } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (up) {
      setError(up.message);
      return;
    }
    router.replace('/admin');
    router.refresh();
  };

  if (error && !ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-red-900/50 bg-gray-900/80 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <a href="/admin" className="mt-4 inline-block text-sm text-gray-400 hover:text-white">
            Retour à la connexion admin
          </a>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <span className="text-gray-500">Vérification du lien…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-400">
          Choisissez un mot de passe pour votre compte administrateur.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          required
          minLength={6}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer et continuer'}
        </button>
      </form>
    </div>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <span className="text-gray-500">Chargement…</span>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
