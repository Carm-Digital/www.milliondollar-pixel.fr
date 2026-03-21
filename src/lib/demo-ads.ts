/**
 * Launch simulation: 22,548 pixels sold = 225 demo blocks (22,500 px) + displayed stat 22,548.
 * Fictional advertisers with isDemo = true; not selectable, not purchasable.
 * Grid is 100×100 blocks (10 000 total).
 */
import { PIXELS_PER_BLOCK } from '@/lib/pricing';

export type LogoStyle = {
  initials: string;
  color: string;
};

export type DemoAd = {
  start_x: number;
  start_y: number;
  width: number;
  height: number;
  label: string;
  slogan: string;
  link: string;
  demo_ads: true;
  isDemo: true;
  logoStyle: LogoStyle;
};

const BRANDS: Omit<DemoAd, 'start_x' | 'start_y' | 'width' | 'height'>[] = [
  { label: 'NovaStack', slogan: 'AI tools for modern teams', link: 'novastack-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'NS', color: '#6366f1' } },
  { label: 'PixelForge', slogan: 'Design at scale', link: 'pixelforge-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'PF', color: '#ec4899' } },
  { label: 'CloudMint', slogan: 'Cloud infra, simplified', link: 'cloudmint-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'CM', color: '#14b8a6' } },
  { label: 'AetherLab', slogan: 'Research meets product', link: 'aetherlab-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'AL', color: '#8b5cf6' } },
  { label: 'BrightScale', slogan: 'Analytics that scale', link: 'brightscale-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'BS', color: '#f59e0b' } },
  { label: 'LaunchGrid', slogan: 'Ship faster', link: 'launchgrid-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'LG', color: '#10b981' } },
  { label: 'CreatorBloom', slogan: 'Grow your audience', link: 'creatorbloom-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'CB', color: '#f97316' } },
  { label: 'VoltStudio', slogan: 'Gaming & interactive', link: 'voltstudio-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'VS', color: '#eab308' } },
  { label: 'SignalNest', slogan: 'APIs that connect', link: 'signalnest-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'SN', color: '#06b6d4' } },
  { label: 'HyperCanvas', slogan: 'Visual collaboration', link: 'hypercanvas-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'HC', color: '#a855f7' } },
  { label: 'MintFlow', slogan: 'Payments, simplified', link: 'mintflow-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'MF', color: '#22c55e' } },
  { label: 'OrbitDesk', slogan: 'Remote workspace', link: 'orbitdesk-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'OD', color: '#3b82f6' } },
  { label: 'VisionLoop', slogan: 'Computer vision', link: 'visionloop-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'VL', color: '#ef4444' } },
  { label: 'NeonPulse', slogan: 'Real-time analytics', link: 'neonpulse-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'NP', color: '#d946ef' } },
  { label: 'SparkLayer', slogan: 'ML infrastructure', link: 'sparklayer-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'SL', color: '#0ea5e9' } },
  { label: 'GridCraft', slogan: 'No-code builder', link: 'gridcraft-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'GC', color: '#84cc16' } },
  { label: 'EchoWorks', slogan: 'Audio for creators', link: 'echoworks-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'EW', color: '#f43f5e' } },
  { label: 'NimbusCore', slogan: 'Dev platform', link: 'nimbuscore-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'NC', color: '#64748b' } },
  { label: 'FluxSocial', slogan: 'Social analytics', link: 'fluxsocial-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'FS', color: '#a855f7' } },
  { label: 'AlphaFrame', slogan: '3D for the web', link: 'alphaframe-demo.com', demo_ads: true, isDemo: true, logoStyle: { initials: 'AF', color: '#14b8a6' } },
];

/** Stable layout across refreshes (bump seed to reshuffle after tuning). */
const DEMO_LAYOUT_SEED = 0x4d444852;

function createSeededRng(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Check if rectangle fits on grid without overlapping occupied cells. */
function fits(grid: boolean[][], x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || y < 0 || x + w > 100 || y + h > 100) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (grid[y + dy][x + dx]) return false;
    }
  }
  return true;
}

/** True if rect is free and has at least one empty cell in the 1px ring outside (spacing from other ads). */
function fitsWithSpacing(
  grid: boolean[][],
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (!fits(grid, x, y, w, h)) return false;
  for (let yy = y - 1; yy <= y + h; yy++) {
    for (let xx = x - 1; xx <= x + w; xx++) {
      if (yy < 0 || yy >= 100 || xx < 0 || xx >= 100) continue;
      if (xx >= x && xx < x + w && yy >= y && yy < y + h) continue;
      if (grid[yy][xx]) return false;
    }
  }
  return true;
}

function mark(grid: boolean[][], x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      grid[y + dy][x + dx] = true;
    }
  }
}

type Zone = { xMin: number; xMax: number; yMin: number; yMax: number; weight: number };

/**
 * ~44% upper / ~38% middle / ~18% lower — bands séparées (évite bande dense en haut).
 * Sous-zones équilibrées gauche / centre / droite.
 */
const PLACEMENT_ZONES: Zone[] = [
  { xMin: 0, xMax: 34, yMin: 0, yMax: 23, weight: 0.15 },
  { xMin: 34, xMax: 66, yMin: 0, yMax: 23, weight: 0.15 },
  { xMin: 66, xMax: 100, yMin: 0, yMax: 23, weight: 0.14 },
  { xMin: 0, xMax: 38, yMin: 26, yMax: 54, weight: 0.13 },
  { xMin: 38, xMax: 62, yMin: 28, yMax: 56, weight: 0.12 },
  { xMin: 62, xMax: 100, yMin: 26, yMax: 54, weight: 0.13 },
  { xMin: 0, xMax: 100, yMin: 58, yMax: 95, weight: 0.18 },
];

function pickZone(rng: () => number): Zone {
  const r = rng();
  let acc = 0;
  const sum = PLACEMENT_ZONES.reduce((s, z) => s + z.weight, 0);
  let t = r * sum;
  for (const z of PLACEMENT_ZONES) {
    acc += z.weight;
    if (t < acc) return z;
  }
  return PLACEMENT_ZONES[PLACEMENT_ZONES.length - 1];
}

/** Moins de micro-1×1, un peu plus de formats moyens = mosaïque plus lisible. */
const SIZE_POOL: [number, number][] = [
  [1, 1],
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [2, 2],
  [2, 2],
  [2, 2],
  [3, 2],
  [2, 3],
  [3, 3],
  [4, 2],
  [2, 4],
  [3, 4],
  [4, 3],
  [4, 4],
  [5, 3],
];

/** 225 blocks (= 22 500 px) : −100 blocs vs avant = −10 000 px de démo. */
function buildPlacements(): [number, number, number, number][] {
  const rng = createSeededRng(DEMO_LAYOUT_SEED);
  const grid: boolean[][] = Array.from({ length: 100 }, () => Array(100).fill(false));
  const out: [number, number, number, number][] = [];
  const TARGET = 225;

  let total = 0;
  let failures = 0;
  const MAX_FAIL = 22_000;

  while (total < TARGET && failures < MAX_FAIL) {
    const pick = SIZE_POOL[Math.floor(rng() * SIZE_POOL.length)];
    let w = pick[0];
    let h = pick[1];
    let blockCount = w * h;
    if (total + blockCount > TARGET) {
      w = 1;
      h = 1;
      blockCount = 1;
    }

    const zone = pickZone(rng);
    /** Rare petits paquets collés ; sinon toujours marge d’1 case (premium / aéré). */
    const cluster = rng() < 0.11;
    const useSpacing = !cluster;

    const xSpan = Math.max(1, zone.xMax - zone.xMin - w + 1);
    const ySpan = Math.max(1, zone.yMax - zone.yMin - h + 1);

    const tryPlace = (x: number, y: number): boolean => {
      const ok = useSpacing ? fitsWithSpacing(grid, x, y, w, h) : fits(grid, x, y, w, h);
      if (ok) {
        mark(grid, x, y, w, h);
        out.push([x, y, w, h]);
        total += blockCount;
        return true;
      }
      return false;
    };

    let placed = false;
    const attempts = 85 + Math.floor(rng() * 70);
    for (let a = 0; a < attempts && !placed; a++) {
      const x = zone.xMin + Math.floor(rng() * xSpan);
      const y = zone.yMin + Math.floor(rng() * ySpan);
      placed = tryPlace(x, y);
    }

    if (!placed) {
      for (let a = 0; a < 200 && !placed && total + blockCount <= TARGET; a++) {
        const x = Math.floor(rng() * (100 - w));
        const y = Math.floor(rng() * (100 - h));
        placed = tryPlace(x, y);
      }
    }

    if (!placed) failures++;
  }

  while (total < TARGET) {
    let placed = false;
    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const x = Math.floor(rng() * 100);
      const y = Math.floor(rng() * 100);
      if (fitsWithSpacing(grid, x, y, 1, 1)) {
        mark(grid, x, y, 1, 1);
        out.push([x, y, 1, 1]);
        total += 1;
        placed = true;
      }
    }
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const x = Math.floor(rng() * 100);
      const y = Math.floor(rng() * 100);
      if (fits(grid, x, y, 1, 1)) {
        mark(grid, x, y, 1, 1);
        out.push([x, y, 1, 1]);
        total += 1;
        placed = true;
      }
    }
    if (!placed) {
      for (let y = 0; y < 100 && !placed; y++) {
        for (let x = 0; x < 100 && !placed; x++) {
          if (!grid[y][x]) {
            grid[y][x] = true;
            out.push([x, y, 1, 1]);
            total += 1;
            placed = true;
          }
        }
      }
    }
    if (!placed) break;
  }

  return out;
}

const PLACEMENTS = buildPlacements();

export const DEMO_ADS: DemoAd[] = PLACEMENTS.map(([start_x, start_y, width, height], i) => {
  const brand = BRANDS[i % BRANDS.length];
  return {
    ...brand,
    start_x,
    start_y,
    width,
    height,
  };
});

/** Total demo blocks (225 for 22,500 pixels; displayed stat is 22,548). */
export function getDemoBlocksCount(demoAds: DemoAd[]): number {
  return demoAds.reduce((s, d) => s + d.width * d.height, 0);
}

export function getDemoAdAt(bx: number, by: number, demoAds: DemoAd[]): DemoAd | null {
  for (const d of demoAds) {
    if (bx >= d.start_x && bx < d.start_x + d.width && by >= d.start_y && by < d.start_y + d.height) {
      return d;
    }
  }
  return null;
}

/** Plus grande tuile démo (en nombre de blocs), pour stats / hero sans révéler la marque. */
export function getLargestDemoAd(demoAds: DemoAd[]): DemoAd | null {
  if (demoAds.length === 0) return null;
  let best = demoAds[0];
  let bestArea = best.width * best.height;
  for (let i = 1; i < demoAds.length; i++) {
    const d = demoAds[i];
    const a = d.width * d.height;
    if (a > bestArea) {
      best = d;
      bestArea = a;
    }
  }
  return best;
}

/** Pixels owned by a demo ad (for tooltip). */
export function getDemoPixels(d: DemoAd): number {
  return d.width * d.height * PIXELS_PER_BLOCK;
}
