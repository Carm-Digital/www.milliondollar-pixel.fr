'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type FakeRecentPurchase = {
  name: string;
  pixels: number;
  /** Âge affiché en heures (pas de minutes — évite l’effet « foule en direct »). */
  hoursAgo: number;
};

/** Predefined pool — believable brands & amounts (no backend). */
const FAKE_PURCHASE_POOL: FakeRecentPurchase[] = [
  { name: 'NovaStack', pixels: 300, hoursAgo: 2 },
  { name: 'PixelForge', pixels: 120, hoursAgo: 5 },
  { name: 'CloudMint', pixels: 500, hoursAgo: 8 },
  { name: 'VoltStudio', pixels: 200, hoursAgo: 12 },
  { name: 'LaunchGrid', pixels: 150, hoursAgo: 18 },
  { name: 'OrbitDesk', pixels: 80, hoursAgo: 3 },
  { name: 'AetherLab', pixels: 250, hoursAgo: 6 },
  { name: 'BrightScale', pixels: 180, hoursAgo: 10 },
  { name: 'CreatorBloom', pixels: 100, hoursAgo: 14 },
  { name: 'SignalNest', pixels: 400, hoursAgo: 20 },
  { name: 'HyperCanvas', pixels: 160, hoursAgo: 4 },
  { name: 'MintFlow', pixels: 90, hoursAgo: 9 },
  { name: 'VisionLoop', pixels: 220, hoursAgo: 7 },
  { name: 'NeonPulse', pixels: 140, hoursAgo: 11 },
  { name: 'SparkLayer', pixels: 320, hoursAgo: 15 },
  { name: 'GridCraft', pixels: 110, hoursAgo: 22 },
  { name: 'EchoWorks', pixels: 70, hoursAgo: 1 },
  { name: 'NimbusCore', pixels: 280, hoursAgo: 16 },
  { name: 'FluxSocial', pixels: 190, hoursAgo: 19 },
  { name: 'AlphaFrame', pixels: 130, hoursAgo: 24 },
];

const VISIBLE_COUNT = 5;

const HOURS_BUCKETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 24] as const;

function formatHoursAgo(hours: number): string {
  const h = Math.max(1, Math.round(hours));
  return `il y a ${h} heure${h > 1 ? 's' : ''}`;
}

function pickInitialSlice(): FakeRecentPurchase[] {
  const shuffled = [...FAKE_PURCHASE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, VISIBLE_COUNT).map((p) => ({ ...p }));
}

function randomIntervalMs(): number {
  return 5000 + Math.floor(Math.random() * 3000);
}

function randomHoursAgo(): number {
  return HOURS_BUCKETS[Math.floor(Math.random() * HOURS_BUCKETS.length)];
}

export function RecentPurchasesFeed() {
  /** Vide au 1er rendu : évite l’erreur d’hydratation (Math.random() différent SSR vs client). */
  const [items, setItems] = useState<FakeRecentPurchase[]>([]);
  const poolRef = useRef(FAKE_PURCHASE_POOL);

  useEffect(() => {
    setItems(pickInitialSlice());
  }, []);

  const replaceOne = useCallback(() => {
    setItems((prev) => {
      if (prev.length === 0) return pickInitialSlice();
      const idx = Math.floor(Math.random() * prev.length);
      const namesInView = new Set(prev.map((p) => p.name));
      const candidates = poolRef.current.filter((p) => !namesInView.has(p.name));
      const source =
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : poolRef.current[Math.floor(Math.random() * poolRef.current.length)];
      const next = [...prev];
      next[idx] = {
        name: source.name,
        pixels: source.pixels,
        hoursAgo: randomHoursAgo(),
      };
      return next;
    });
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeoutId = setTimeout(() => {
        replaceOne();
        schedule();
      }, randomIntervalMs());
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [items.length, replaceOne]);

  return (
    <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
        <span className="text-lg" aria-hidden>
          🔥
        </span>
        <span className="text-sm font-bold text-white">Achats récents</span>
        <span className="text-xs text-zinc-500 ml-auto font-medium">Dernière activité</span>
      </div>
      <ul className="p-3 flex flex-col gap-2" aria-live="polite">
        {items.length === 0
          ? Array.from({ length: VISIBLE_COUNT }, (_, i) => (
              <li
                key={`recent-skeleton-${i}`}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 animate-pulse"
                aria-hidden
              >
                <span className="w-4 h-4 mt-0.5 rounded bg-white/10 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded-md w-4/5 max-w-[220px]" />
                  <div className="h-3 bg-white/5 rounded-md w-24" />
                </div>
              </li>
            ))
          : items.map((p, i) => (
              <li
                key={`${p.name}-${i}-${p.hoursAgo}`}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden>
                  🔥
                </span>
                <div className="min-w-0 flex-1 text-sm leading-snug">
                  <p className="text-white">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-zinc-400 font-normal"> a acheté </span>
                    <span className="font-semibold text-emerald-400 tabular-nums">
                      {p.pixels.toLocaleString('fr-FR')} pixels
                    </span>
                  </p>
                  <p className="text-zinc-500 text-xs mt-1 font-medium">{formatHoursAgo(p.hoursAgo)}</p>
                </div>
              </li>
            ))}
      </ul>
    </div>
  );
}
