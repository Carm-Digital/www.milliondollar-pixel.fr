'use client';

import { useEffect, useState } from 'react';

type Ad = {
  id: string;
  advertiser_name: string;
  width: number;
  height: number;
  purchase_date?: string;
  image_url?: string | null;
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const min = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  const day = Math.floor(h / 24);
  return `il y a ${day} jour${day > 1 ? 's' : ''}`;
}

const ROTATE_MS = 5500;

export function RecentPurchasesFeed({ purchases }: { purchases: Ad[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (purchases.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % purchases.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [purchases.length]);

  if (purchases.length === 0) return null;

  const ad = purchases[index];
  const pixels = ad.width * ad.height * 100;

  return (
    <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <span className="text-lg" aria-hidden>🔥</span>
        <span className="text-sm font-semibold text-white">Achat récent</span>
        {purchases.length > 1 && (
          <span className="text-xs text-zinc-500 ml-auto">
            {index + 1}/{purchases.length}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt=""
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/10"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white">
              <span className="text-emerald-400">{ad.advertiser_name}</span>
              {' '}vient d&apos;acheter {pixels.toLocaleString('fr-FR')} pixels
            </p>
            <p className="text-zinc-500 text-sm mt-0.5">
              {ad.purchase_date ? timeAgo(ad.purchase_date) : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
