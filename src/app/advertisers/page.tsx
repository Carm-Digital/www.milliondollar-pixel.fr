'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Ad = {
  id: string;
  start_x: number;
  start_y: number;
  width: number;
  height: number;
  image_url: string | null;
  advertiser_name: string;
  link: string;
  purchase_date?: string;
};

export default function AdvertisersPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAds = useCallback(async () => {
    const res = await fetch('/api/ads');
    if (res.ok) {
      const data = await res.json();
      setAds(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-[#0b0b0f]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors">
            Million Dollar Pixel
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Mur
            </Link>
            <Link href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Répertoire des annonceurs</h1>
        <p className="text-zinc-400 mb-10">
          Tous les acheteurs qui ont rejoint le mur — logo, nom, site et présence. {ads.length} annonceur{ads.length !== 1 ? 's' : ''} à ce jour.
        </p>

        {loading ? (
          <p className="text-zinc-500">Chargement…</p>
        ) : ads.length === 0 ? (
          <p className="text-zinc-500">Aucun annonceur pour l&apos;instant.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => {
              const pixels = ad.width * ad.height * 100;
              const href = ad.link.startsWith('http') ? ad.link : 'https://' + ad.link;
              const displayLink = ad.link.replace(/^https?:\/\//i, '').split('/')[0];
              return (
                <a
                  key={ad.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-center gap-4 group"
                >
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {ad.image_url ? (
                      <img
                        src={ad.image_url}
                        alt={ad.advertiser_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-zinc-500 text-lg font-semibold">
                        {ad.advertiser_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {ad.advertiser_name}
                    </p>
                    <p className="text-emerald-400/90 text-sm">{pixels.toLocaleString('fr-FR')} pixels</p>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate" title={href}>
                      {displayLink || '—'}
                    </p>
                    <p className="text-zinc-600 text-xs mt-0.5">{formatDate(ad.purchase_date)}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-zinc-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
