'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PixelGrid } from '@/components/PixelGrid';
import { PurchasePanel } from '@/components/PurchasePanel';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { RecentPurchasesFeed } from '@/components/RecentPurchasesFeed';
import { HeatmapLegend } from '@/components/HeatmapLegend';
import { DEMO_ADS, getDemoPixels, getLargestDemoAd } from '@/lib/demo-ads';
import {
  getDisplayStats,
  PIXELS_DISPLAY_PURCHASES_THRESHOLD,
  shouldShowPurchasedPixelsOnWall,
} from '@/lib/launch-simulation';

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
  { step: '1', title: 'Choisissez vos pixels', desc: 'Sélectionnez une zone sur le mur. 1 pixel = 1 €, 1 bloc (10×10) = 100 €. Le mur complet vaut 1 000 000 €.' },
  { step: '2', title: 'Ajoutez votre logo et lien', desc: 'Nom, URL et image. Votre annonce sera visible par des milliers de visiteurs, pour toujours.' },
  { step: '3', title: 'Paiement sécurisé', desc: 'Stripe sécurise votre paiement. Votre pixel reste affiché en permanence sur le mur.' },
];

const FAQ_ITEMS = [
  { q: 'Combien coûtent les pixels ?', a: '1 pixel = 1 €. Les pixels sont regroupés en blocs de 10×10 (100 pixels), donc 1 bloc = 100 €. Le récapitulatif affiche toujours le total exact avant paiement. Exemple : 5 blocs = 500 pixels = 500 €.' },
  { q: 'Les pixels restent-ils pour toujours ?', a: 'Oui. Une fois achetés, vos pixels restent affichés sur le mur de manière permanente. C\'est un véritable bien numérique sur Internet.' },
  { q: 'Puis-je modifier mon image après achat ?', a: 'L\'achat est définitif pour l\'instant. Nous travaillons sur des options de mise à jour pour les annonceurs existants.' },
  { q: 'Pourquoi acheter maintenant ?', a: 'Le mur affiche 1 000 000 pixels à 1 € l\'un. Les emplacements partent au fur et à mesure ; réservez votre zone avant qu\'elle ne soit prise.' },
  { q: 'Le paiement est-il sécurisé ?', a: 'Oui. Nous utilisons Stripe pour tous les paiements. Aucune donnée bancaire ne transite par nos serveurs.' },
];

/** Affichage volontairement grossier (heures / jours seulement) : pas de minutes qui changent chaque minute. */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (min < 0) return '';

  if (min < 24 * 60) {
    const h = Math.max(1, Math.ceil(min / 60));
    return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  }
  const day = Math.floor(min / (60 * 24));
  return `il y a ${day} jour${day > 1 ? 's' : ''}`;
}

const CONTACT_EMAIL = 'contact@milliondollarpixel.com';

export default function HomePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<{ x: number; y: number }[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [tickerKey, setTickerKey] = useState(0);
  /** Recalcul timeAgo (granularité heures : rafraîchir toutes les 5 min suffit). */
  const [, setRelativeTimeTick] = useState(0);
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
    const id = setInterval(() => {
      fetchStats();
      fetchAds();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchStats, fetchAds]);

  useEffect(() => {
    const id = setInterval(() => setRelativeTimeTick((n) => n + 1), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

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
      { threshold: 0.06, rootMargin: '0px 0px -50px 0px' }
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

  const featuredAds = ads.filter((a) => a.image_url).slice(0, 8);
  const lastAd =
    [...ads].sort((a, b) => {
      const ta = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const tb = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return tb - ta;
    })[0] ?? null;
  const displayStats = getDisplayStats(stats ?? null);
  const showPurchasedPixelsOnWall = shouldShowPurchasedPixelsOnWall(displayStats.totalPixelsSold);
  const biggestBuyer =
    [...ads].sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
  const biggestBuyerPixels = biggestBuyer
    ? biggestBuyer.width * biggestBuyer.height * 100
    : 0;
  const largestDemoAd = getLargestDemoAd(DEMO_ADS);
  const largestDemoPixels = largestDemoAd ? getDemoPixels(largestDemoAd) : 0;
  /** Démo comptée en anonyme si elle dépasse le plus gros achat réel, ou s’il n’y a pas encore d’achat réel. */
  const showAnonymousDemoLeader =
    largestDemoPixels > 0 &&
    (largestDemoPixels > biggestBuyerPixels || !biggestBuyer);
  const showRealLeader = biggestBuyer && !showAnonymousDemoLeader;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-white logo-glow flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1" opacity="0.6"/>
                <rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/>
                <rect x="9" y="9" width="6" height="6" rx="1" opacity="0.4"/>
              </svg>
            </span>
            Million Dollar Pixel
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/advertisers" className="text-sm text-zinc-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5">
              Annonceurs
            </Link>
            <a href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/5 hidden sm:inline">
              Admin
            </a>
            <button
              type="button"
              onClick={() => setSelectionMode((m) => !m)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                selectionMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]'
                  : 'btn-secondary text-zinc-300 hover:text-white'
              }`}
            >
              {selectionMode ? 'Sélection en cours' : 'Acheter des pixels'}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero - compact so wall is visible quickly */}
        <section className="relative overflow-hidden border-b border-[var(--border)] dot-pattern">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.05] via-transparent to-transparent" />
          <div className="orb orb-1" aria-hidden />
          <div className="orb orb-2" aria-hidden />
          <div className="orb orb-3" aria-hidden />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
            <div className="flex justify-center mb-5 animate-fade-in-up">
              <span className="hero-badge">Le mur de pixels le plus connu d&apos;Internet</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in-up animate-fade-in-up-delay-1 leading-[1.05] text-gradient">
              Possédez un morceau d&apos;internet.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animate-fade-in-up-delay-2">
              1 000 000 pixels à vendre. Affichez votre marque, votre projet ou votre site sur un mur public permanent — pour toujours.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up animate-fade-in-up-delay-2">
              <span className="price-chip">1 pixel = 1 €</span>
              <span className="text-zinc-700 select-none">·</span>
              <span className="price-chip">1 bloc (10×10) = 100 €</span>
              <span className="text-zinc-700 select-none">·</span>
              <span className="price-chip price-chip-featured">Mur complet = 1 000 000 €</span>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-fade-in-up animate-fade-in-up-delay-3">
              <button
                type="button"
                onClick={scrollToPurchase}
                className="cta-primary rounded-xl px-8 py-4 font-semibold text-white flex items-center gap-2 text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2h6m-6 0h6" /></svg>
                Acheter des pixels
              </button>
              <button
                type="button"
                onClick={scrollToWall}
                className="btn-secondary rounded-xl px-8 py-4 font-semibold text-white flex items-center gap-2 text-base btn-lift"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Explorer le mur
              </button>
            </div>
            <p className="mt-5 text-sm font-medium text-zinc-500 animate-fade-in-up animate-fade-in-up-delay-4">
              Les meilleurs emplacements partent en premier. Réservez votre zone avant qu&apos;elle ne soit prise.
            </p>
            {displayStats.pixelsRemaining < 1_000_000 && (
              <p className="mt-2 text-sm text-amber-400/95 font-medium animate-fade-in-up animate-fade-in-up-delay-4">
                Plus que <strong className="text-white">{displayStats.pixelsRemaining.toLocaleString('fr-FR')}</strong> pixels disponibles
              </p>
            )}

            {/* Plus gros acheteur */}
            <div className="mt-12 animate-fade-in-up animate-fade-in-up-delay-4">
              <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-5 sm:gap-8 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.12] via-teal-500/[0.06] to-transparent px-6 sm:px-8 py-5 shadow-[0_0_48px_-12px_rgba(16,185,129,0.22)] max-w-2xl mx-auto w-full">
                {showAnonymousDemoLeader ? (
                  <>
                    <div className="flex items-center gap-4 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-4xl flex-shrink-0" aria-hidden>
                        👑
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Plus gros acheteur
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-white mt-1">
                          Acheteur anonyme
                        </p>
                        <p className="text-sm text-zinc-500 mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                          {showPurchasedPixelsOnWall ? (
                            'Identité divulguée'
                          ) : (
                            <>
                              <span>Identité non divulguée</span>
                              <span className="text-zinc-600 tabular-nums text-xs sm:text-sm font-medium">
                                · {displayStats.totalPixelsSold.toLocaleString('fr-FR')} /{' '}
                                {PIXELS_DISPLAY_PURCHASES_THRESHOLD.toLocaleString('fr-FR')} px
                              </span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-zinc-400 mt-1">
                          <span className="text-emerald-400 font-semibold tabular-nums">
                            {largestDemoPixels.toLocaleString('fr-FR')}
                          </span>{' '}
                          pixels réservés sur le mur
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-3 flex-shrink-0">
                      <div
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-500 text-2xl font-light"
                        aria-hidden
                      >
                        ?
                      </div>
                      <button
                        type="button"
                        onClick={scrollToWall}
                        className="rounded-xl px-4 py-3 text-sm font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors whitespace-nowrap"
                      >
                        Voir le mur →
                      </button>
                    </div>
                  </>
                ) : showRealLeader ? (
                  <>
                    <div className="flex items-center gap-4 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-4xl flex-shrink-0" aria-hidden>
                        👑
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Plus gros acheteur
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                          {biggestBuyer!.advertiser_name}
                        </p>
                        <p className="text-sm text-zinc-400 mt-1">
                          <span className="text-emerald-400 font-semibold tabular-nums">
                            {biggestBuyerPixels.toLocaleString('fr-FR')}
                          </span>{' '}
                          pixels réservés sur le mur
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-3 flex-shrink-0">
                      {biggestBuyer!.image_url ? (
                        <img
                          src={biggestBuyer!.image_url}
                          alt=""
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/15 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 text-sm font-bold">
                          {biggestBuyer!.advertiser_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <a
                        href={
                          biggestBuyer!.link.startsWith('http')
                            ? biggestBuyer!.link
                            : `https://${biggestBuyer!.link}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl px-4 py-3 text-sm font-semibold bg-white/10 text-white hover:bg-white/15 border border-white/10 transition-colors whitespace-nowrap"
                      >
                        Visiter →
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl flex-shrink-0" aria-hidden>
                        👑
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Plus gros acheteur
                        </p>
                        <p className="text-lg font-bold text-white mt-1">Place encore disponible</p>
                        <p className="text-sm text-zinc-500 mt-1 max-w-md">
                          Aucun achat enregistré pour l&apos;instant. Réservez la plus grande zone et devenez le leader du mur.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={scrollToPurchase}
                      className="rounded-xl px-5 py-3 text-sm font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
                    >
                      Acheter des pixels
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live stats - premium cards (real + launch simulation) */}
            <div className="mt-16 animate-fade-in-up animate-fade-in-up-delay-5">
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="flex items-center gap-1.5 trust-pill">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                  En direct
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
                {[
                  { label: 'Pixels vendus', value: displayStats.totalPixelsSold, suffix: '' },
                  { label: 'Pixels restants', value: displayStats.pixelsRemaining, suffix: '' },
                  { label: 'Annonceurs', value: displayStats.advertisersCount, suffix: '' },
                ].map(({ label, value, suffix }) => (
                  <div key={label} className="glass-card stat-card rounded-2xl px-4 py-5 text-center border border-[var(--border)]">
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight stat-value number-display">
                      <AnimatedCounter value={value} suffix={suffix} duration={1400} />
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1.5 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOMO Ticker */}
        {lastAd && (
          <div key={tickerKey} className="border-b border-[var(--border)] bg-gradient-to-r from-emerald-950/20 via-transparent to-emerald-950/20 py-2.5 overflow-hidden">
            <div className="ticker-wrap flex items-center">
              <span className="text-sm text-zinc-400 whitespace-nowrap px-8 flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" aria-hidden />
                <span className="text-emerald-400 font-semibold">{lastAd.advertiser_name}</span>
                {' '}vient d&apos;acheter {(lastAd.width * lastAd.height * 100).toLocaleString('fr-FR')} pixels · {timeAgo(lastAd.purchase_date ?? '')}
              </span>
              <span className="text-sm text-zinc-500 whitespace-nowrap px-8 flex items-center gap-2.5">
                <span className="text-zinc-700" aria-hidden>◆</span>
                Réservez votre zone avant qu&apos;elle ne soit prise · 1 pixel = 1 €
              </span>
              <span className="text-sm text-zinc-400 whitespace-nowrap px-8 flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" aria-hidden />
                <span className="text-emerald-400 font-semibold">{lastAd.advertiser_name}</span>
                {' '}vient d&apos;acheter {(lastAd.width * lastAd.height * 100).toLocaleString('fr-FR')} pixels · {timeAgo(lastAd.purchase_date ?? '')}
              </span>
              <span className="text-sm text-zinc-500 whitespace-nowrap px-8 flex items-center gap-2.5">
                <span className="text-zinc-700" aria-hidden>◆</span>
                Réservez votre zone avant qu&apos;elle ne soit prise · 1 pixel = 1 €
              </span>
            </div>
          </div>
        )}

        {/* Pixel wall - main attraction, fully visible on homepage */}
        <section
          ref={(el) => { if (el) sectionRefs.current[0] = el; }}
          className="reveal w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
        >
          <div ref={wallRef} className="scroll-mt-24" />
          <div className="w-full max-w-[1680px] mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            {/* Wall column: dense mosaic, nearly full width, max 1400–1600px */}
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div className="w-full max-w-[1600px] mb-3 space-y-2">
                <p className="text-zinc-500 text-xs sm:text-sm font-medium">
                  Glissez pour sélectionner une zone sur le mur (blocs disponibles uniquement)
                </p>
                {!showPurchasedPixelsOnWall && (
                  <p className="text-xs sm:text-sm text-zinc-400 font-medium rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <span className="text-amber-400/95 font-semibold">Affichage des pixels achetés</span>
                    {' '}
                    sur le mur à partir de{' '}
                    <span className="text-white tabular-nums">
                      {PIXELS_DISPLAY_PURCHASES_THRESHOLD.toLocaleString('fr-FR')}
                    </span>{' '}
                    pixels vendus
                    <span className="text-zinc-500 block mt-1 text-[11px] sm:text-xs">
                      Progression :{' '}
                      <span className="text-zinc-300 tabular-nums">
                        {displayStats.totalPixelsSold.toLocaleString('fr-FR')}
                      </span>{' '}
                      / {PIXELS_DISPLAY_PURCHASES_THRESHOLD.toLocaleString('fr-FR')} pixels
                    </span>
                  </p>
                )}
              </div>
              <div className="w-full max-w-[min(100%,1600px)] aspect-square rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/60 bg-[var(--bg-elevated)]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)]">
                    <span className="text-zinc-500 font-medium">Chargement du mur…</span>
                  </div>
                ) : (
                  <PixelGrid
                    ads={showPurchasedPixelsOnWall ? ads : []}
                    selectedBlocks={selectedBlocks}
                    onSelectBlocks={setSelectedBlocks}
                    onBlockClick={handleBlockClick}
                    selectionMode={selectionMode}
                    demoAds={DEMO_ADS}
                  />
                )}
              </div>
              <HeatmapLegend />
              <p className="mt-4 text-center text-sm font-medium text-zinc-400">
                Imaginez votre logo ici. Votre marque restera sur ce mur pour toujours.
              </p>
              {displayStats.pixelsRemaining < 1_000_000 && (
                <p className="mt-1 text-center text-sm font-semibold text-amber-400/95">
                  Plus que <strong className="text-white">{displayStats.pixelsRemaining.toLocaleString('fr-FR')}</strong> pixels disponibles
                </p>
              )}
            </div>
            {/* Purchase panel: sticky on desktop, below wall on mobile */}
            <aside className="w-full lg:w-[340px] lg:flex-shrink-0">
              <div className="lg:sticky lg:top-28 space-y-5">
                <RecentPurchasesFeed />
                <PurchasePanel
                  selectedBlocks={selectedBlocks}
                  onClearSelection={() => setSelectedBlocks([])}
                  onPurchaseSuccess={() => { fetchAds(); fetchStats(); }}
                />
                {selectedBlocks.length === 0 && (
                  <div className="glass-card rounded-2xl border border-[var(--border)] p-6 text-center">
                    <p className="text-zinc-500 text-sm font-medium mb-1">
                      Sélectionnez une zone sur le mur pour voir le prix et acheter.
                    </p>
                    <p className="text-xs text-amber-400/90 font-medium">
                      {displayStats.pixelsRemaining.toLocaleString('fr-FR')} pixels restants
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* Featured advertisers */}
        <section
          ref={(el) => { if (el) sectionRefs.current[1] = el; }}
          className="reveal border-t border-[var(--border)] py-14 sm:py-20"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Ils ont <span className="text-gradient">rejoint le mur</span></h3>
            <p className="text-zinc-500 text-sm sm:text-base text-center mb-10 max-w-xl mx-auto font-medium">
              Ces marques ont réservé leur place. Rejoignez-les et affichez votre logo en permanence.
            </p>
            {featuredAds.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  {featuredAds.map((ad) => (
                    <a
                      key={ad.id}
                      href={ad.link.startsWith('http') ? ad.link : 'https://' + ad.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-card logo-card rounded-2xl p-4 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center border border-[var(--border)] hover:border-emerald-500/35 hover:shadow-[0_0_32px_-6px_rgba(16,185,129,0.3)] overflow-hidden"
                      title={ad.advertiser_name}
                    >
                      {ad.image_url ? (
                        <img src={ad.image_url} alt={ad.advertiser_name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-zinc-500 text-xs font-semibold truncate">{ad.advertiser_name}</span>
                      )}
                    </a>
                  ))}
                </div>
                <p className="text-center mt-8">
                  <Link href="/advertisers" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                    Voir tous les annonceurs →
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-zinc-500 text-center font-medium">
                Les premiers annonceurs apparaîtront ici. Soyez parmi eux.
              </p>
            )}
          </div>
        </section>

        {/* Trust copy */}
        <section className="border-t border-[var(--border)] py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-xl sm:text-2xl font-bold text-gradient">
              Votre publicité restera visible pour toujours.
            </p>
            <p className="mt-3 text-zinc-500 font-medium">
              Votre marque devient une partie de l&apos;histoire d&apos;Internet.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <span className="trust-pill">Paiement sécurisé Stripe</span>
              <span className="trust-pill">Affichage permanent</span>
              <span className="trust-pill">1 pixel = 1 €</span>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          ref={(el) => { if (el) sectionRefs.current[2] = el; }}
          className="reveal border-t border-[var(--border)] py-14 sm:py-20"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">Comment <span className="text-gradient">ça marche</span></h3>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="glass-card rounded-2xl p-6 sm:p-8 border border-[var(--border)] hover:border-emerald-500/25 transition-all group text-center"
                >
                  <div className="w-14 h-14 rounded-2xl step-badge text-emerald-400 font-bold text-xl flex items-center justify-center mx-auto mb-5">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-white mb-2 text-lg">{item.title}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ - professional */}
        <section
          ref={(el) => { if (el) sectionRefs.current[3] = el; }}
          className="reveal border-t border-[var(--border)] py-14 sm:py-20"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">Questions <span className="text-gradient">fréquentes</span></h3>
            <p className="text-zinc-500 text-center text-sm font-medium mb-10">Tout ce que vous devez savoir avant d&apos;acheter.</p>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="glass-card rounded-xl border border-[var(--border)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full px-5 py-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-semibold text-white pr-4">{item.q}</span>
                    <span className={`text-emerald-400 flex-shrink-0 transition-transform duration-200 ${faqOpen === i ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>
                  <div className={`faq-body ${faqOpen === i ? 'faq-body-open' : ''}`}>
                    <div className="px-5 sm:px-6 pb-5 pt-3 text-zinc-400 text-sm leading-relaxed border-t border-[var(--border)]">
                      {item.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="reveal border-t border-[var(--border)] py-14 sm:py-20">
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <div className="contact-card px-8 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Contact</h3>
              <p className="text-zinc-500 text-sm font-medium mb-6">
                Une question ? Nous vous répondons rapidement.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 cta-primary rounded-xl px-6 py-3 font-semibold text-white text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Legal footer */}
        <footer className="border-t border-[var(--border)] py-8 sm:py-10 bg-[var(--bg-elevated)]/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 16 16">
                    <rect x="1" y="1" width="6" height="6" rx="1" opacity="0.6"/>
                    <rect x="9" y="1" width="6" height="6" rx="1"/>
                    <rect x="1" y="9" width="6" height="6" rx="1"/>
                    <rect x="9" y="9" width="6" height="6" rx="1" opacity="0.4"/>
                  </svg>
                </span>
                © {new Date().getFullYear()} Million Dollar Pixel. Tous droits réservés.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                <Link href="/advertisers" className="text-sm text-zinc-500 hover:text-white font-medium transition-colors">
                  Annonceurs
                </Link>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-zinc-500 hover:text-white font-medium transition-colors">
                  Contact
                </a>
                <span className="text-sm text-zinc-600 font-medium">Mentions légales</span>
                <span className="text-sm text-zinc-600 font-medium">CGV</span>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-zinc-600 font-medium max-w-2xl mx-auto">
              Paiement sécurisé par Stripe. Vos données sont protégées. Ce site est un projet de démonstration.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
