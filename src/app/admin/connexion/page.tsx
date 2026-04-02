'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminGatePage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/admin/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Accès refusé.');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-800 bg-gray-900/80 p-6"
      >
        <h1 className="text-xl font-semibold">Accès administration</h1>
        <p className="text-sm text-gray-400">
          Saisissez le mot de passe du panneau. Ensuite vous pourrez vous connecter avec votre compte
          (email Supabase).
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe panneau"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
          required
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {pending ? 'Vérification…' : 'Continuer vers la connexion'}
        </button>
        <a href="/" className="block text-center text-sm text-gray-500 hover:text-gray-300">
          Retour au site
        </a>
      </form>
    </div>
  );
}
