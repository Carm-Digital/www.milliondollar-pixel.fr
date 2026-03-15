'use client';

export function HeatmapLegend() {
  return (
    <div className="mt-4">
      <p className="text-center text-xs text-amber-400/90 mb-2">
        Zone premium : le centre du mur coûte 5 $/pixel et attire le plus de vues.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mr-2">Valeur des zones</p>
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded border border-amber-500/40"
          style={{ background: 'rgba(251, 191, 36, 0.25)' }}
          aria-hidden
        />
        <span className="text-sm text-zinc-300">
          <strong className="text-amber-400">Zone premium (centre)</strong> — 5 $/pixel
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded border border-emerald-500/40"
          style={{ background: 'rgba(34, 197, 94, 0.2)' }}
          aria-hidden
        />
        <span className="text-sm text-zinc-300">
          <strong className="text-emerald-400">Zone milieu</strong> — 2 $/pixel
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-4 h-4 rounded border border-cyan-500/40"
          style={{ background: 'rgba(34, 211, 238, 0.15)' }}
          aria-hidden
        />
        <span className="text-sm text-zinc-300">
          <strong className="text-cyan-400">Périphérie</strong> — 1 $/pixel
        </span>
      </div>
      </div>
    </div>
  );
}
