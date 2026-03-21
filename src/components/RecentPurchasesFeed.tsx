'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type FakeRecentPurchase = {
  name: string;
  pixels: number;
  minutesAgo: number;
};

/** Predefined pool — believable brands & amounts (no backend). */
const FAKE_PURCHASE_POOL: FakeRecentPurchase[] = [
  { name: 'NovaStack', pixels: 300, minutesAgo: 2 },
  { name: 'PixelForge', pixels: 120, minutesAgo: 5 },
  { name: 'CloudMint', pixels: 500, minutesAgo: 8 },
  { name: 'VoltStudio', pixels: 200, minutesAgo: 12 },
  { name: 'LaunchGrid', pixels: 150, minutesAgo: 15 },
  { name: 'OrbitDesk', pixels: 80, minutesAgo: 20 },
  { name: 'AetherLab', pixels: 250, minutesAgo: 3 },
  { name: 'BrightScale', pixels: 180, minutesAgo: 7 },
  { name: 'CreatorBloom', pixels: 100, minutesAgo: 9 },
  { name: 'SignalNest', pixels: 400, minutesAgo: 11 },
  { name: 'HyperCanvas', pixels: 160, minutesAgo: 14 },
  { name: 'MintFlow', pixels: 90, minutesAgo: 18 },
  { name: 'VisionLoop', pixels: 220, minutesAgo: 4 },
  { name: 'NeonPulse', pixels: 140, minutesAgo: 6 },
  { name: 'SparkLayer', pixels: 320, minutesAgo: 10 },
  { name: 'GridCraft', pixels: 110, minutesAgo: 13 },
  { name: 'EchoWorks', pixels: 70, minutesAgo: 17 },
  { name: 'NimbusCore', pixels: 280, minutesAgo: 1 },
  { name: 'FluxSocial', pixels: 190, minutesAgo: 16 },
  { name: 'AlphaFrame', pixels: 130, minutesAgo: 19 },
];

const VISIBLE_COUNT = 5;

function formatMinutesAgo(minutes: number): string {
  if (minutes <= 1) return "à l'instant";
  return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function pickInitialSlice(): FakeRecentPurchase[] {
  const shuffled = [...FAKE_PURCHASE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, VISIBLE_COUNT).map((p) => ({ ...p }));
}

function randomIntervalMs(): number {
  return 5000 + Math.floor(Math.random() * 3000);
}

export function RecentPurchasesFeed() {
  const [items, setItems] = useState<FakeRecentPurchase[]>(() => pickInitialSlice());
  const poolRef = useRef(FAKE_PURCHASE_POOL);

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
        minutesAgo: 1 + Math.floor(Math.random() * 22),
      };
      return next;
    });
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeoutId = setTimeout(() => {
        replaceOne();
        schedule();
      }, randomIntervalMs());
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [replaceOne]);

  return (
    <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
        <span className="text-lg" aria-hidden>
          🔥
        </span>
        <span className="text-sm font-bold text-white">Achats récents</span>
        <span className="text-xs text-zinc-500 ml-auto font-medium">Activité en direct</span>
      </div>
      <ul className="p-3 flex flex-col gap-2" aria-live="polite">
        {items.map((p, i) => (
          <li
            key={`${p.name}-${i}-${p.minutesAgo}`}
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
              <p className="text-zinc-500 text-xs mt-1 font-medium">{formatMinutesAgo(p.minutesAgo)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
