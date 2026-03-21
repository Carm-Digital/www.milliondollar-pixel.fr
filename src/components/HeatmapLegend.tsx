'use client';

import { PRICE_PER_BLOCK_EURO, TOTAL_WALL_EUROS } from '@/lib/pricing';

export function HeatmapLegend() {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3.5 px-4 rounded-xl bg-white/[0.03] border border-[var(--border)]">
        <span className="text-sm text-zinc-300 font-medium">
          <strong className="text-white">1 pixel</strong> = 1 €
        </span>
        <span className="text-sm text-zinc-300 font-medium">
          <strong className="text-white">1 bloc (10×10)</strong> = {PRICE_PER_BLOCK_EURO.toLocaleString('fr-FR')} €
        </span>
        <span className="text-sm text-zinc-300 font-medium">
          <strong className="text-white">Mur complet</strong> = {TOTAL_WALL_EUROS.toLocaleString('fr-FR')} €
        </span>
      </div>
    </div>
  );
}
