'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PixelAd } from '@/types/database';

export default function AdminPage() {
  const [ads, setAds] = useState<PixelAd[]>([]);
  const [stats, setStats] = useState<{ totalAds: number; totalBlocks: number; totalPixels: number; revenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    supabaseRef.current = createClient();
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { email: user.email ?? '' } : null);
      if (!user) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [adsRes, statsRes] = await Promise.all([
        fetch('/api/admin/ads'),
        fetch('/api/admin/stats'),
      ]);

      if (adsRes.status === 401 || statsRes.status === 401) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (adsRes.ok) {
        const data = await adsRes.json();
        setAds(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    setUser(data.user ? { email: data.user.email ?? '' } : null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotStatus('sending');
    const supabase = supabaseRef.current ?? createClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${origin}/admin/reinitialiser-mot-de-passe`,
    });
    if (error) {
      setForgotStatus('error');
      setForgotMessage(error.message);
      return;
    }
    setForgotStatus('sent');
    setForgotMessage(
      'Si un compte existe pour cet e-mail, vous recevrez un lien pour choisir un nouveau mot de passe.'
    );
  };

  const handleSignOut = async () => {
    await fetch('/api/admin/gate', { method: 'DELETE' }).catch(() => {});
    await supabaseRef.current?.auth.signOut();
    setUser(null);
    setAds([]);
    setStats(null);
    window.location.href = '/admin/connexion';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    const res = await fetch(`/api/admin/ads?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAds((prev) => prev.filter((a) => a.id !== id));
      if (stats) setStats((s) => s ? { ...s, totalAds: s.totalAds - 1 } : null);
    } else {
      const data = await res.json();
      alert(data.error || 'Delete failed');
    }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    const res = await fetch('/api/admin/ads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approved }),
    });
    if (res.ok) {
      setAds((prev) => prev.map((a) => (a.id === id ? { ...a, approved } : a)));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const rows = ads.map((a) => ({
      id: a.id,
      start_x: a.start_x,
      start_y: a.start_y,
      width: a.width,
      height: a.height,
      advertiser_name: a.advertiser_name,
      link: a.link,
      image_url: a.image_url,
      purchase_date: a.purchase_date,
      stripe_payment_id: a.stripe_payment_id,
      approved: a.approved,
    }));
    const csv = [
      Object.keys(rows[0] ?? {}).join(','),
      ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-ads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <span className="text-gray-500">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          {!forgotOpen ? (
            <form onSubmit={handleSignIn} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/80 p-6">
              <h1 className="text-xl font-semibold">Connexion admin</h1>
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Mot de passe"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                required
              />
              <button type="submit" className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500">
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotStatus('idle');
                  setForgotMessage(null);
                }}
                className="w-full text-sm text-gray-400 hover:text-white underline-offset-2 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/80 p-6">
              <h1 className="text-xl font-semibold">Réinitialiser le mot de passe</h1>
              <p className="text-sm text-gray-400">
                Indiquez l’e-mail de votre compte admin. Vous recevrez un lien (vérifiez aussi les spams).
              </p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                required
                autoComplete="email"
              />
              {forgotMessage && (
                <p className={`text-sm ${forgotStatus === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                  {forgotMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={forgotStatus === 'sending'}
                className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
              >
                {forgotStatus === 'sending' ? 'Envoi…' : 'Envoyer le lien'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false);
                  setForgotStatus('idle');
                  setForgotMessage(null);
                }}
                className="w-full text-sm text-gray-400 hover:text-white"
              >
                Retour à la connexion
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-black/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin · Million Dollar Pixel</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <a href="/" className="text-sm text-gray-400 hover:text-white">Grid</a>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg px-3 py-1.5 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-gray-400 text-sm">Total ads</p>
              <p className="text-2xl font-semibold">{stats.totalAds}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-gray-400 text-sm">Blocks sold</p>
              <p className="text-2xl font-semibold">{stats.totalBlocks}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-gray-400 text-sm">Pixels sold</p>
              <p className="text-2xl font-semibold">{stats.totalPixels.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-2xl font-semibold">{stats.revenue.toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        )}

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || ads.length === 0}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="p-3 font-medium">Advertiser</th>
                <th className="p-3 font-medium">Position</th>
                <th className="p-3 font-medium">Size</th>
                <th className="p-3 font-medium">Link</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Approved</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-b border-gray-800/80 hover:bg-gray-900/50">
                  <td className="p-3">{ad.advertiser_name}</td>
                  <td className="p-3 text-gray-400">({ad.start_x}, {ad.start_y})</td>
                  <td className="p-3 text-gray-400">{ad.width}×{ad.height}</td>
                  <td className="p-3 max-w-[160px] truncate text-gray-400">{ad.link}</td>
                  <td className="p-3 text-gray-400">{new Date(ad.purchase_date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(ad.id, !ad.approved)}
                      className={`rounded px-2 py-1 text-xs ${ad.approved ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}
                    >
                      {ad.approved ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(ad.id)}
                      className="rounded px-2 py-1 text-xs bg-red-900/50 text-red-400 hover:bg-red-800/50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ads.length === 0 && !loading && (
            <p className="p-6 text-center text-gray-500">No ads yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
