'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PixelGrid } from '@/components/PixelGrid';
import { PurchasePanel } from '@/components/PurchasePanel';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { RecentPurchasesFeed } from '@/components/RecentPurchasesFeed';
import { HeatmapLegend } from '@/components/HeatmapLegend';

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

type Stats = {
  totalPixelsSold: number;
  revenue: number;
  advertisersCount: number;
  pixelsRemaining: number;
};

const HOW_IT_WORKS = [
  { step: '1', title: 'Choisissez vos pixels', desc: 'Sélectionnez la zone sur le mur. Centre (5 $/px), milieu (2 $/px) ou périphérie (1 $/px).' },
  { step: '2', title: 'Ajoutez votre logo et votre lien', desc: 'Nom, URL et image. Votre annonce sera visible par des milliers de visiteurs.' },
  { step: '3', title: 'Votre publicité apparaît sur le mur', desc: 'Paiement sécurisé via Stripe. Votre pixel reste affiché en permanence.' },
];

const FAQ_ITEMS = [
  { q: 'Combien coûtent les pixels ?', a: 'Le prix dépend de la zone : centre 5 $/pixel, zone intermédiaire 2 $/pixel, périphérie 1 $/pixel. Le récapitulatif affiche toujours le total exact avant paiement.' },
  { q: 'Les pixels restent-ils pour toujours ?', a: 'Oui. Une fois achetés, vos pixels restent affichés sur le mur de manière permanente. C\'est un véritable morceau d\'Internet.' },
  { q: 'Puis-je modifier mon image ?', a: 'Pour l\'instant, l\'achat est définitif. Nous travaillons sur des options de mise à jour pour les annonceurs.' },
  { q: 'Pourquoi acheter tôt ?', a: 'Les meilleurs emplacements (centre) sont limités et partent en premier. Les pixels au centre deviennent rares et ont le plus de valeur.' },
];

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'à l\'instant';
  if (min < 60) return `il y a ${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  const day = Math.floor(h / 24);
  return `il y a ${day} jour${day > 1 ? 's' : ''}`;
}

export default function HomePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<{ x: number; y: number }[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [tickerKey, setTickerKey] = useState(0);
  const wallRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<HTMLElement[]>([]);

  const fetchAds = useCallback(async () => {
    const res = await fetch('/api/ads');
    if (res.ok) {
      const data = await res.json();
      setAds(data);
    }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  }, []);

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, [fetchAds, fetchStats]);

  useEffect(() => {
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      fetchAds();
      fetchStats();
      setTickerKey((k) => k + 1);
      window.history.replaceState({}, '', '/');
    }
  }, [fetchAds, fetchStats]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('reveal-visible');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [ads, stats]);

  const handleBlockClick = useCallback((ad: Ad) => {
    if (ad.link.startsWith('http')) {
      window.open(ad.link, '_blank');
    } else {
      window.open('https://' + ad.link, '_blank');
    }
  }, []);

  const scrollToWall = () => wallRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToPurchase = () => {
    setSelectionMode(true);
    wallRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const lastPurchases = ads.slice(0, 5);
  const topAdvertisers = [...ads]
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .slice(0, 5);
  const featuredAds = ads.filter((a) => a.image_url).slice(0, 8);
  const lastAd = ads[0];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-[#0b0b0f]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Million Dollar Pixel
          </h1>
          <nav className="flex items-center gap-3">
            <Link href="/annonceurs" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Annonceurs
            </Link>
            <a href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Admin
            </a>
            <button
              type="button"
              onClick={() => setSelectionMode((m) => !m)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${
                selectionMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_-4px_rgba(34,197,94,0.3)]'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {selectionMode ? 'Sélection en cours…' : 'Sélectionner des pixels'}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,197,94,0.1),transparent)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight animate-fade-in-up leading-[1.1]">
              Possédez un morceau d&apos;internet.
            </h2>
            <p className="mt-5 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up animate-fade-in-up-delay-1 whitespace-pre-line">
              1 000 000 pixels à vendre.{'\n'}
              Affichez votre marque, votre projet ou votre site sur un mur public permanent.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up animate-fade-in-up-delay-3">
              <button
                type="button"
                onClick={scrollToPurchase}
                className="cta-primary rounded-2xl px-8 py-3.5 font-semibold text-white flex items-center gap-2"
              >
                <span>🚀</span> Acheter des pixels
              </button>
              <button
                type="button"
                onClick={scrollToWall}
                className="rounded-2xl border border-white/15 bg-white/5 px-8 py-3.5 font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all btn-lift flex items-center gap-2"
              >
                <span>👀</span> Explorer le mur
              </button>
            </div>
            <p className="mt-4 text-sm text-emerald-400/90 animate-fade-in-up animate-fade-in-up-delay-4">
              Les meilleurs emplacements partent en premier.
            </p>
            {stats && stats.pixelsRemaining < 1_000_000 && (
              <p className="mt-2 text-sm text-amber-400/90 animate-fade-in-up animate-fade-in-up-delay-4">
                Plus que <strong>{stats.pixelsRemaining.toLocaleString('fr-FR')}</strong> pixels disponibles.
              </p>
            )}
            {/* Live stats */}
            <div className="mt-14 animate-fade-in-up animate-fade-in-up-delay-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">En direct</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {[
                  { label: 'Pixels vendus', value: stats?.totalPixelsSold ?? 0, suffix: '' },
                  { label: 'Pixels restants', value: stats?.pixelsRemaining ?? 0, suffix: '' },
                  { label: 'Revenus générés', value: stats?.revenue ?? 0, suffix: ' $' },
                  { label: 'Annonceurs', value: stats?.advertisersCount ?? 0, suffix: '' },
                ].map(({ label, value, suffix }) => (
                  <div key={label} className="glass-card rounded-2xl px-4 py-4 text-center border border-white/[0.06]">
                    <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      <AnimatedCounter value={value} suffix={suffix} duration={1400} />
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOMO Ticker */}
        {lastAd && (
          <div key={tickerKey} className="border-b border-white/[0.06] bg-white/[0.02] py-2 overflow-hidden">
            <div className="ticker-wrap flex">
              <p className="text-sm text-zinc-400 whitespace-nowrap px-4">
                <span className="text-emerald-400 font-medium">{lastAd.advertiser_name}</span>
                {' '}vient d&apos;acheter {(lastAd.width * lastAd.height * 100).toLocaleString('fr-FR')} pixels · Pixel acheté {timeAgo(lastAd.purchase_date ?? '')}
              </p>
              <p className="text-sm text-zinc-400 whitespace-nowrap px-4">
                Les pixels au centre deviennent rares. Réservez votre zone avant qu&apos;elle ne soit prise.
              </p>
            </div>
          </div>
        )}

        {/* Wall + Purchase */}
        <section
          ref={(el) => { if (el) sectionRefs.current[0] = el; }}
          className="reveal max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
        >
          <div ref={wallRef} className="scroll-mt-24" />
          <p className="text-zinc-500 text-sm mb-2 max-w-2xl">
            Sélectionnez des pixels sur la grille (glissez pour une zone). Minimum 10×10. Centre 5 $/px, milieu 2 $/px, périphérie 1 $/px.
          </p>
          <p className="text-zinc-600 text-xs mb-6">
            Les meilleurs emplacements partent en premier. Les pixels au centre deviennent rares.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-10">
            <div className="xl:col-span-8">
              <div className="aspect-square max-h-[min(78vh,820px)] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02]">
                    <span className="text-zinc-500">Chargement du mur…</span>
                  </div>
                ) : (
                  <PixelGrid
                    ads={ads}
                    selectedBlocks={selectedBlocks}
                    onSelectBlocks={setSelectedBlocks}
                    onBlockClick={handleBlockClick}
                    selectionMode={selectionMode}
                  />
                )}
              </div>
              <HeatmapLegend />
              {stats && stats.pixelsRemaining < 1_000_000 && (
                <p className="mt-3 text-center text-sm text-amber-400/90">
                  Plus que <strong>{stats.pixelsRemaining.toLocaleString('fr-FR')}</strong> pixels disponibles. Les zones centrales partent en premier.
                </p>
              )}
            </div>
            <div className="xl:col-span-4 space-y-6">
              <div className="xl:sticky xl:top-24 space-y-6">
                <RecentPurchasesFeed purchases={ads.slice(0, 10)} />
                <PurchasePanel
                  selectedBlocks={selectedBlocks}
                  onClearSelection={() => setSelectedBlocks([])}
                  onPurchaseSuccess={() => { fetchAds(); fetchStats(); }}
                />
                {selectedBlocks.length === 0 && (
                  <div className="glass-card rounded-3xl border border-white/[0.06] p-8 text-center">
                    <p className="text-zinc-500 text-sm mb-2">
                      Sélectionnez des blocs sur le mur pour afficher le panier.
                    </p>
                    {stats && (
                      <p className="text-xs text-amber-400/80">
                        {stats.pixelsRemaining.toLocaleString('fr-FR')} pixels restants · Réservez votre zone.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Featured ads - logos */}
        {featuredAds.length > 0 && (
          <section
            ref={(el) => { if (el) sectionRefs.current[1] = el; }}
            className="reveal max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-white/[0.06]"
          >
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Annonceurs à la une</h3>
            <p className="text-zinc-500 text-sm text-center mb-6 max-w-xl mx-auto">
              Ces marques ont déjà réservé leur place sur le mur. Rejoignez-les.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {featuredAds.map((ad) => (
                <a
                  key={ad.id}
                  href={ad.link.startsWith('http') ? ad.link : 'https://' + ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card rounded-2xl p-4 w-20 h-20 flex items-center justify-center border border-white/[0.06] hover:border-emerald-500/30 transition-colors overflow-hidden"
                  title={ad.advertiser_name}
                >
                  {ad.image_url ? (
                    <img src={ad.image_url} alt={ad.advertiser_name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-zinc-500 text-xs font-medium truncate">{ad.advertiser_name}</span>
                  )}
                </a>
              ))}
            </div>
            <p className="text-center mt-6">
              <Link href="/annonceurs" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                Voir tous les annonceurs →
              </Link>
            </p>
          </section>
        )}

        {/* Derniers achats + Top annonceurs */}
        <section
          ref={(el) => { if (el) sectionRefs.current[2] = el; }}
          className="reveal max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/[0.06]"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold text-white mb-4">Derniers achats</h3>
              <div className="space-y-2">
                {lastPurchases.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Aucun achat pour l&apos;instant.</p>
                ) : (
                  lastPurchases.map((ad) => (
                    <div
                      key={ad.id}
                      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-white/[0.06] hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {ad.image_url ? (
                          <img src={ad.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0" />
                        )}
                        <span className="font-medium text-white truncate">{ad.advertiser_name}</span>
                      </div>
                      <span className="text-zinc-500 text-sm flex-shrink-0">{formatDate(ad.purchase_date)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Top annonceurs</h3>
              <div className="space-y-2">
                {topAdvertisers.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Aucun annonceur pour l&apos;instant.</p>
                ) : (
                  topAdvertisers.map((ad) => (
                    <div
                      key={ad.id}
                      className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-white/[0.06] hover:border-white/10 transition-colors"
                    >
                      <span className="font-medium text-white truncate">{ad.advertiser_name}</span>
                      <span className="text-emerald-400/90 text-sm flex-shrink-0">{ad.width * ad.height * 100} px</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it works - 3 steps */}
        <section
          ref={(el) => { if (el) sectionRefs.current[3] = el; }}
          className="reveal max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t border-white/[0.06]"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">Comment ça marche</h3>
          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="glass-card rounded-2xl p-6 border border-white/[0.06] hover:border-emerald-500/20 transition-colors group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold text-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  {item.step}
                </div>
                <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                <p className="text-zinc-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section
          ref={(el) => { if (el) sectionRefs.current[4] = el; }}
          className="reveal max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t border-white/[0.06]"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">FAQ</h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="glass-card rounded-xl border border-white/[0.06] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <span className={`text-emerald-400 transition-transform flex-shrink-0 ${faqOpen === i ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4 text-zinc-400 text-sm border-t border-white/[0.06] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
