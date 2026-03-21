'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOCKS_PER_SIDE, BLOCK_SIZE } from '@/types/database';
import { getDemoAdAt, getDemoPixels, type DemoAd } from '@/lib/demo-ads';

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

type PixelGridProps = {
  ads: Ad[];
  selectedBlocks: { x: number; y: number }[];
  onSelectBlocks: (blocks: { x: number; y: number }[]) => void;
  onBlockClick: (ad: Ad) => void;
  selectionMode: boolean;
  demoAds?: DemoAd[];
};

/** Fixed scale: wall fits container and stays centered (no zoom). */
function getScaleAndOffset(
  width: number,
  height: number
): { scale: number; offsetX: number; offsetY: number; cellW: number; cellH: number } {
  const scale = Math.min(width, height) / (BLOCKS_PER_SIDE * BLOCK_SIZE);
  const gridPx = BLOCKS_PER_SIDE * BLOCK_SIZE * scale;
  const offsetX = (width - gridPx) / 2;
  const offsetY = (height - gridPx) / 2;
  return {
    scale,
    offsetX,
    offsetY,
    cellW: BLOCK_SIZE * scale,
    cellH: BLOCK_SIZE * scale,
  };
}

export function PixelGrid({
  ads,
  selectedBlocks,
  onSelectBlocks,
  onBlockClick,
  selectionMode,
  demoAds = [],
}: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverBlock, setHoverBlock] = useState<{ x: number; y: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ad: Ad } | null>(null);
  const [demoTooltip, setDemoTooltip] = useState<{ x: number; y: number; demo: DemoAd } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 400 });
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawRef = useRef<() => void>(() => {});

  const getBlockAt = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { offsetX, offsetY, cellW, cellH } = getScaleAndOffset(rect.width, rect.height);
    const bx = Math.floor((x - offsetX) / cellW);
    const by = Math.floor((y - offsetY) / cellH);
    if (bx < 0 || bx >= BLOCKS_PER_SIDE || by < 0 || by >= BLOCKS_PER_SIDE) return null;
    return { x: bx, y: by };
  }, []);

  const findAdAt = useCallback(
    (bx: number, by: number): Ad | null => {
      for (const ad of ads) {
        if (
          bx >= ad.start_x &&
          bx < ad.start_x + ad.width &&
          by >= ad.start_y &&
          by < ad.start_y + ad.height
        ) {
          return ad;
        }
      }
      return null;
    },
    [ads]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const { scale, offsetX, offsetY, cellW, cellH } = getScaleAndOffset(w, h);

    const bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#050508');
    bgGradient.addColorStop(0.5, '#0a0a0f');
    bgGradient.addColorStop(1, '#060609');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    const startBX = 0;
    const startBY = 0;
    const endBX = BLOCKS_PER_SIDE;
    const endBY = BLOCKS_PER_SIDE;

    for (let by = startBY; by < endBY; by++) {
      for (let bx = startBX; bx < endBX; bx++) {
        const ad = findAdAt(bx, by);
        const x = offsetX + bx * cellW;
        const y = offsetY + by * cellH;

        const isSelected =
          selectionMode &&
          selectedBlocks.some((b) => b.x === bx && b.y === by);
        const isHover = hoverBlock?.x === bx && hoverBlock?.y === by;

        if (ad) {
          if (ad.image_url) {
            let img = loadedImages.current.get(ad.id);
            if (!img) {
              img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = ad.image_url;
              loadedImages.current.set(ad.id, img);
              img.onload = () => draw();
            }
            if (img.complete && img.naturalWidth) {
              const iw = img.naturalWidth;
              const ih = img.naturalHeight;
              const scale = Math.max(cellW / iw, cellH / ih);
              const sw = cellW / scale;
              const sh = cellH / scale;
              const sx = (iw - sw) / 2;
              const sy = (ih - sh) / 2;
              ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
            } else {
              ctx.fillStyle = '#18181b';
              ctx.fillRect(x, y, cellW, cellH);
            }
          } else {
            ctx.fillStyle = '#18181b';
            ctx.fillRect(x, y, cellW, cellH);
          }
        } else {
          const demo = getDemoAdAt(bx, by, demoAds);
          if (demo) {
            const ls = demo.logoStyle;
            ctx.fillStyle = ls.color;
            ctx.fillRect(x, y, cellW, cellH);
            const size = Math.min(cellW, cellH);
            const pad = Math.max(1, size * 0.18);
            const logoSize = Math.max(4, size - pad * 2);
            const cx = x + cellW / 2;
            const cy = y + cellH / 2;
            const r = logoSize / 2;
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (logoSize >= 6) {
              ctx.fillStyle = ls.color;
              ctx.font = `600 ${Math.max(5, Math.min(11, Math.floor(logoSize * 0.5)))}px system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(ls.initials, cx, cy);
            }
            if (cellH >= 12 && cellW >= 18) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
              const labelFont = Math.max(5, Math.min(9, Math.floor(cellH * 0.32)));
              ctx.font = `600 ${labelFont}px system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              const labelY = demo.slogan && cellH >= 20 ? y + cellH - 8 : y + cellH - 2;
              ctx.fillText(demo.label, cx, labelY);
              if (demo.slogan && cellH >= 20 && cellW >= 24) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.font = `${Math.max(4, Math.min(7, Math.floor(cellH * 0.22)))}px system-ui, sans-serif`;
                ctx.fillText(demo.slogan, cx, y + cellH - 2);
              }
            }
          } else {
            ctx.fillStyle = '#0d0d10';
            ctx.fillRect(x, y, cellW, cellH);
          }
        }

        if (isSelected) {
          ctx.save();
          ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW, cellH);
          ctx.restore();
        }
      }
    }

    if (hoverBlock) {
      const bx = hoverBlock.x;
      const by = hoverBlock.y;
      const x = offsetX + bx * cellW;
      const y = offsetY + by * cellH;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x, y, cellW, cellH);
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.restore();
    }
  }, [selectedBlocks, hoverBlock, selectionMode, findAdAt, demoAds, containerSize]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setContainerSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const block = getBlockAt(e.clientX, e.clientY);

      if (selectionMode && block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) return;
        const demo = getDemoAdAt(block.x, block.y, demoAds);
        if (demo?.isDemo) return;
        setDragStart(block);
        if (!selectedBlocks.some((b) => b.x === block.x && b.y === block.y)) {
          onSelectBlocks([...selectedBlocks, block]);
        }
      } else if (block && !selectionMode) {
        const ad = findAdAt(block.x, block.y);
        if (ad) onBlockClick(ad);
      }
    },
    [getBlockAt, selectionMode, selectedBlocks, onSelectBlocks, onBlockClick, findAdAt, demoAds]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const block = getBlockAt(e.clientX, e.clientY);

      setHoverBlock(block);
      if (block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) {
          setTooltip({ x: e.clientX, y: e.clientY, ad });
          setDemoTooltip(null);
        } else {
          setTooltip(null);
          const demo = getDemoAdAt(block.x, block.y, demoAds);
          setDemoTooltip(demo ? { x: e.clientX, y: e.clientY, demo } : null);
        }
      } else {
        setTooltip(null);
        setDemoTooltip(null);
      }

      if (dragStart && selectionMode && block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) return;
        const demo = getDemoAdAt(block.x, block.y, demoAds);
        if (demo?.isDemo) return;
        const minX = Math.min(dragStart.x, block.x);
        const minY = Math.min(dragStart.y, block.y);
        const maxX = Math.max(dragStart.x, block.x);
        const maxY = Math.max(dragStart.y, block.y);
        const next: { x: number; y: number }[] = [];
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (findAdAt(x, y)) continue;
            if (getDemoAdAt(x, y, demoAds)?.isDemo) continue;
            next.push({ x, y });
          }
        }
        onSelectBlocks(next);
      }
    },
    [getBlockAt, findAdAt, selectionMode, dragStart, onSelectBlocks, demoAds]
  );

  const handlePointerUp = useCallback(() => {
    setDragStart(null);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0b0f] shadow-2xl shadow-black/50 ring-1 ring-white/[0.04]">
      <div
        ref={containerRef}
        className="absolute inset-0 transition-shadow duration-300 rounded-3xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHoverBlock(null);
          setTooltip(null);
          setDemoTooltip(null);
          setDragStart(null);
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ left: 0, top: 0, width: '100%', height: '100%' }}
        />
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-3 rounded-2xl bg-zinc-900/95 border border-white/10 text-sm text-white shadow-2xl max-w-[260px] backdrop-blur-xl"
          style={{ left: Math.min(tooltip.x + 14, window.innerWidth - 280), top: tooltip.y + 14 }}
        >
          <p className="font-semibold truncate text-white">{tooltip.ad.advertiser_name}</p>
          <p className="text-zinc-400 truncate text-xs mt-0.5">{tooltip.ad.link}</p>
          <p className="text-zinc-500 text-xs mt-1">
            Taille : {(tooltip.ad.width * tooltip.ad.height * 100).toLocaleString('fr-FR')} pixels
            {tooltip.ad.purchase_date && (
              <> · {new Date(tooltip.ad.purchase_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </p>
          <p className="text-emerald-400/90 text-xs mt-0.5">Cliquez pour visiter</p>
          {tooltip.ad.image_url && (
            <img
              src={tooltip.ad.image_url}
              alt=""
              className="mt-2 rounded-lg w-20 h-20 object-cover border border-white/10"
            />
          )}
        </div>
      )}
      {demoTooltip && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-3 rounded-2xl bg-zinc-900/95 border border-white/15 text-sm text-white shadow-2xl max-w-[260px] backdrop-blur-xl"
          style={{ left: Math.min(demoTooltip.x + 14, window.innerWidth - 280), top: demoTooltip.y + 14 }}
        >
          <p className="font-semibold truncate text-white">{demoTooltip.demo.label}</p>
          <p className="text-zinc-300 text-xs mt-0.5">&quot;{demoTooltip.demo.slogan}&quot;</p>
          <p className="text-zinc-400 truncate text-xs mt-1">{demoTooltip.demo.link}</p>
          <p className="text-zinc-500 text-xs mt-1">
            {getDemoPixels(demoTooltip.demo).toLocaleString('fr-FR')} pixels
          </p>
        </div>
      )}
    </div>
  );
}
