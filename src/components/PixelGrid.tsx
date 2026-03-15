'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOCKS_PER_SIDE, BLOCK_SIZE } from '@/types/database';
import { getZone } from '@/lib/pricing';

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
};

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 1.2;
const ZOOM_DEFAULT = 0.65;
const LERP = 0.1;

export function PixelGrid({
  ads,
  selectedBlocks,
  onSelectBlocks,
  onBlockClick,
  selectionMode,
}: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayScaleRef = useRef(ZOOM_DEFAULT);
  const [targetScale, setTargetScale] = useState(ZOOM_DEFAULT);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoverBlock, setHoverBlock] = useState<{ x: number; y: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ad: Ad } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef<number>(0);
  const drawRef = useRef<() => void>(() => {});

  const getBlockAt = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const scale = displayScaleRef.current;
      const cellW = BLOCK_SIZE * scale;
      const cellH = BLOCK_SIZE * scale;
      const bx = Math.floor((x - pan.x) / cellW);
      const by = Math.floor((y - pan.y) / cellH);
      if (bx < 0 || bx >= BLOCKS_PER_SIDE || by < 0 || by >= BLOCKS_PER_SIDE) return null;
      return { x: bx, y: by };
    },
    [pan]
  );

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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = displayScaleRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, w, h);

    const cellW = BLOCK_SIZE * scale;
    const cellH = BLOCK_SIZE * scale;

    const startBX = Math.max(0, Math.floor(-pan.x / cellW));
    const startBY = Math.max(0, Math.floor(-pan.y / cellH));
    const endBX = Math.min(BLOCKS_PER_SIDE, Math.ceil((w - pan.x) / cellW) + 1);
    const endBY = Math.min(BLOCKS_PER_SIDE, Math.ceil((h - pan.y) / cellH) + 1);

    const t = performance.now() / 1000;
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.5);

    for (let by = startBY; by < endBY; by++) {
      for (let bx = startBX; bx < endBX; bx++) {
        const ad = findAdAt(bx, by);
        const x = pan.x + bx * cellW;
        const y = pan.y + by * cellH;

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
              ctx.drawImage(img, x, y, cellW, cellH);
            } else {
              ctx.fillStyle = '#12121a';
              ctx.fillRect(x, y, cellW, cellH);
            }
          } else {
            ctx.fillStyle = '#12121a';
            ctx.fillRect(x, y, cellW, cellH);
          }
        } else {
          const zone = getZone(bx, by);
          const heatmapAlpha = zone === 'center' ? 0.12 : zone === 'middle' ? 0.07 : 0.04;
          const heatmapColor =
            zone === 'center'
              ? `rgba(251, 191, 36, ${heatmapAlpha})`
              : zone === 'middle'
                ? `rgba(34, 197, 94, ${heatmapAlpha})`
                : `rgba(34, 211, 238, ${heatmapAlpha})`;
          ctx.fillStyle = heatmapColor;
          ctx.fillRect(x, y, cellW, cellH);
        }

        if (isSelected) {
          ctx.save();
          ctx.shadowColor = 'rgba(34, 197, 94, 0.9)';
          ctx.shadowBlur = 10 + 6 * pulse;
          ctx.strokeStyle = `rgba(34, 197, 94, ${0.6 + 0.4 * pulse})`;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
          ctx.restore();
        }
        if (isHover && !ad) {
          ctx.save();
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
          ctx.restore();
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let by = startBY; by < endBY; by++) {
      for (let bx = startBX; bx < endBX; bx++) {
        const x = pan.x + bx * cellW;
        const y = pan.y + by * cellH;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
  }, [pan, selectedBlocks, hoverBlock, selectionMode, findAdAt]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const current = displayScaleRef.current;
      const target = targetScale;
      const diff = target - current;
      if (Math.abs(diff) < 0.001) {
        displayScaleRef.current = target;
      } else {
        displayScaleRef.current = current + diff * LERP;
      }
      drawRef.current();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetScale]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const block = getBlockAt(e.clientX, e.clientY);
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setLastPan(pan);
        return;
      }
      if (e.button !== 0) return;

      if (selectionMode && block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) return;
        setDragStart(block);
        if (!selectedBlocks.some((b) => b.x === block.x && b.y === block.y)) {
          onSelectBlocks([...selectedBlocks, block]);
        }
      } else if (block && !selectionMode) {
        const ad = findAdAt(block.x, block.y);
        if (ad) onBlockClick(ad);
      }
    },
    [getBlockAt, selectionMode, selectedBlocks, onSelectBlocks, onBlockClick, findAdAt, pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const block = getBlockAt(e.clientX, e.clientY);

      if (isPanning) {
        setPan({
          x: lastPan.x + e.movementX,
          y: lastPan.y + e.movementY,
        });
        return;
      }

      setHoverBlock(block);
      if (block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) setTooltip({ x: e.clientX, y: e.clientY, ad });
        else setTooltip(null);
      } else {
        setTooltip(null);
      }

      if (dragStart && selectionMode && block) {
        const ad = findAdAt(block.x, block.y);
        if (ad) return;
        const minX = Math.min(dragStart.x, block.x);
        const minY = Math.min(dragStart.y, block.y);
        const maxX = Math.max(dragStart.x, block.x);
        const maxY = Math.max(dragStart.y, block.y);
        const next: { x: number; y: number }[] = [];
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (!findAdAt(x, y)) next.push({ x, y });
          }
        }
        onSelectBlocks(next);
      }
    },
    [
      getBlockAt,
      findAdAt,
      isPanning,
      lastPan,
      selectionMode,
      dragStart,
      onSelectBlocks,
    ]
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    setDragStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTargetScale((s) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s - e.deltaY * 0.002)));
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    c.addEventListener('wheel', prevent, { passive: false });
    return () => c.removeEventListener('wheel', prevent);
  }, []);

  const zoomIn = () => setTargetScale((s) => Math.min(ZOOM_MAX, s + 0.12));
  const zoomOut = () => setTargetScale((s) => Math.max(ZOOM_MIN, s - 0.12));
  const resetZoom = () => setTargetScale(ZOOM_DEFAULT);

  const [containerSize, setContainerSize] = useState({ w: 400, h: 400 });
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

  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const scaleForMinimap = targetScale;
  const viewportW = containerSize.w / (BLOCK_SIZE * scaleForMinimap);
  const viewportH = containerSize.h / (BLOCK_SIZE * scaleForMinimap);
  const viewportLeft = -pan.x / (BLOCK_SIZE * scaleForMinimap);
  const viewportTop = -pan.y / (BLOCK_SIZE * scaleForMinimap);

  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cell = size / BLOCKS_PER_SIDE;
    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, size, size);
    for (let by = 0; by < BLOCKS_PER_SIDE; by++) {
      for (let bx = 0; bx < BLOCKS_PER_SIDE; bx++) {
        const ad = findAdAt(bx, by);
        const px = bx * cell;
        const py = by * cell;
        if (ad) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
          ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
        } else {
          const zone = getZone(bx, by);
          ctx.fillStyle = zone === 'center' ? 'rgba(251,191,36,0.25)' : zone === 'middle' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)';
          ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
        }
      }
    }
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.lineWidth = 2;
    const vx = (viewportLeft / BLOCKS_PER_SIDE) * size;
    const vy = (viewportTop / BLOCKS_PER_SIDE) * size;
    const vw = (viewportW / BLOCKS_PER_SIDE) * size;
    const vh = (viewportH / BLOCKS_PER_SIDE) * size;
    ctx.strokeRect(Math.max(0, vx), Math.max(0, vy), Math.min(vw, size - vx), Math.min(vh, size - vy));
  }, [pan, containerSize, ads, findAdAt, targetScale, viewportLeft, viewportTop, viewportW, viewportH]);

  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    const div = minimapRef.current;
    if (!div) return;
    const rect = div.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const bx = Math.floor((mx / rect.width) * BLOCKS_PER_SIDE);
    const by = Math.floor((my / rect.height) * BLOCKS_PER_SIDE);
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const cx = clamp(bx, viewportW / 2, BLOCKS_PER_SIDE - 1 - viewportW / 2);
    const cy = clamp(by, viewportH / 2, BLOCKS_PER_SIDE - 1 - viewportH / 2);
    setPan({
      x: containerSize.w / 2 - cx * BLOCK_SIZE * scaleForMinimap,
      y: containerSize.h / 2 - cy * BLOCK_SIZE * scaleForMinimap,
    });
  }, [containerSize, scaleForMinimap, viewportW, viewportH]);

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
          setDragStart(null);
        }}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ left: 0, top: 0, width: '100%', height: '100%' }}
        />
      </div>

      <div
        ref={minimapRef}
        role="button"
        tabIndex={0}
        onClick={handleMinimapClick}
        className="absolute bottom-4 left-4 w-[100px] h-[100px] rounded-xl border border-white/10 bg-black/80 backdrop-blur-md overflow-hidden cursor-pointer shadow-xl ring-1 ring-white/5 hover:ring-emerald-500/30 transition-all"
        title="Cliquez pour naviguer"
      >
        <canvas ref={minimapCanvasRef} className="w-full h-full block" width={100} height={100} />
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-1.5 shadow-xl">
        <button
          type="button"
          onClick={zoomIn}
          className="rounded-xl p-2.5 text-white hover:bg-white/10 transition-colors"
          aria-label="Zoom avant"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={zoomOut}
          className="rounded-xl p-2.5 text-white hover:bg-white/10 transition-colors"
          aria-label="Zoom arrière"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium"
        >
          Reset
        </button>
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
    </div>
  );
}
