'use client';

import { useState } from 'react';
import { formatPrice } from '@/types/database';
import { getTotalPriceDollars, PRICE_PER_BLOCK_EURO, PIXELS_PER_BLOCK } from '@/lib/pricing';

type PurchasePanelProps = {
  selectedBlocks: { x: number; y: number }[];
  onClearSelection: () => void;
  onPurchaseSuccess: () => void;
};

function IconUser() {
  return (
    <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172a4 4 0 01-5.656 0L11 12.172l-1.172 1.172a4 4 0 01-5.656 0L3 11.828a4 4 0 000 5.656l4 4a4 4 0 005.656 0l1.172-1.172a4 4 0 005.656 0l1.172-1.172a4 4 0 005.656 0l4-4a4 4 0 000-5.656z" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function PurchasePanel({
  selectedBlocks,
  onClearSelection,
  onPurchaseSuccess,
}: PurchasePanelProps) {
  const [advertiserName, setAdvertiserName] = useState('');
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockCount = selectedBlocks.length;
  const pixelCount = blockCount * PIXELS_PER_BLOCK;
  const totalPriceDollars = getTotalPriceDollars(selectedBlocks);
  const totalPriceFormatted = formatPrice(totalPriceDollars);

  const setFile = (file: File | null) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) setFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (blockCount === 0) return;
    if (!advertiserName.trim() || !link.trim()) {
      setError('Veuillez saisir le nom et le lien.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.set('file', imageFile);
        formData.set('name', advertiserName);
        const up = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!up.ok) {
          const data = await up.json().catch(() => ({}));
          throw new Error(data.error || 'Échec de l\'upload de l\'image');
        }
        const { url } = await up.json();
        imageUrl = url;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: selectedBlocks,
          advertiser_name: advertiserName.trim(),
          link: link.trim(),
          image_url: imageUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Échec du paiement');

      if (data.url) {
        onClearSelection();
        onPurchaseSuccess();
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (blockCount === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-7 border border-[var(--border-strong)] shadow-lg">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-white">
          Finaliser l&apos;achat
        </h3>
      </div>
      <p className="text-zinc-500 text-sm font-medium mb-6">
        Remplissez le formulaire. Paiement sécurisé par Stripe.
      </p>

      {/* Pricing - 1 bloc = 100 pixels = 100 € */}
      <div className="rounded-xl bg-black/40 border border-[var(--border)] p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Tarif : 1 pixel = 1 € · 1 bloc (10×10) = {PRICE_PER_BLOCK_EURO} €
        </p>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <dt className="text-zinc-400 font-medium">Blocs sélectionnés</dt>
            <dd className="font-semibold text-white">{blockCount} bloc{blockCount > 1 ? 's' : ''}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-zinc-400 font-medium">Pixels</dt>
            <dd className="font-semibold text-white">{pixelCount.toLocaleString('fr-FR')} pixels</dd>
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-[var(--border)]">
            <dt className="text-zinc-300 font-semibold">Total à payer</dt>
            <dd className="text-xl font-bold text-emerald-400">{totalPriceFormatted}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Nom ou marque
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all input-glow">
            <IconUser />
            <input
              type="text"
              value={advertiserName}
              onChange={(e) => setAdvertiserName(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 focus:outline-none font-medium"
              placeholder="Votre nom ou marque"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Lien du site
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all input-glow">
            <IconLink />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 focus:outline-none font-medium"
              placeholder="https://..."
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Logo ou image <span className="text-zinc-500 font-normal">(optionnel)</span>
          </label>
          <label
            className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed border-[var(--border)] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden min-h-[100px] focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/30"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full max-h-28 object-cover"
                />
                <span className="absolute bottom-2 right-2 text-xs text-white/90 bg-black/70 px-2 py-1 rounded-lg font-medium">
                  Cliquer pour changer
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-zinc-500 text-sm py-6 font-medium">
                <IconImage />
                Glissez une image ou cliquez
              </span>
            )}
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20 font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClearSelection}
            className="flex-1 rounded-xl btn-secondary px-4 py-3.5 text-zinc-300 hover:text-white font-semibold btn-lift"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl cta-primary px-4 py-3.5 font-bold text-white disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
          >
            {loading ? 'Redirection…' : `Payer ${totalPriceFormatted}`}
          </button>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-medium">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Paiement sécurisé par Stripe
        </p>
      </form>
    </div>
  );
}
