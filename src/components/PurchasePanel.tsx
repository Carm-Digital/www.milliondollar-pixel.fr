'use client';

import { useState } from 'react';
import { formatPrice } from '@/types/database';
import { getTotalPriceDollars } from '@/lib/pricing';

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
  const pixelCount = blockCount * 100;
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
    <div className="glass-card glow-border rounded-3xl p-6 sm:p-7 border border-white/[0.08]">
      <h3 className="text-xl font-semibold text-white mb-1">
        Acheter la sélection
      </h3>
      <p className="text-zinc-400 text-sm mb-6">
        Remplissez le formulaire puis validez le paiement.
      </p>

      <div className="rounded-2xl bg-black/30 border border-white/[0.06] p-4 mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
          Récapitulatif
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-400">Blocs sélectionnés</dt>
            <dd className="font-medium text-white">{blockCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">Pixels</dt>
            <dd className="font-medium text-white">{pixelCount.toLocaleString('fr-FR')}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/[0.06]">
            <dt className="text-zinc-300 font-medium">Prix total</dt>
            <dd className="text-lg font-semibold text-emerald-400">{totalPriceFormatted}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Nom ou marque
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all input-glow">
            <IconUser />
            <input
              type="text"
              value={advertiserName}
              onChange={(e) => setAdvertiserName(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
              placeholder="Votre nom ou marque"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Lien du site
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all input-glow">
            <IconLink />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
              placeholder="https://..."
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Image de l&#39;annonce <span className="text-zinc-500 font-normal">(optionnel)</span>
          </label>
          <label
            className="flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all cursor-pointer overflow-hidden min-h-[100px] focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/30"
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
                <span className="absolute bottom-2 right-2 text-xs text-white/90 bg-black/60 px-2 py-1 rounded-lg">
                  Cliquer pour changer
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-zinc-500 text-sm py-6">
                <IconImage />
                Glissez une image ou cliquez
              </span>
            )}
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClearSelection}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all font-medium btn-lift"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-2xl cta-primary px-4 py-3.5 font-semibold text-white disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
          >
            {loading ? 'Traitement…' : `Payer ${totalPriceFormatted}`}
          </button>
        </div>
      </form>
    </div>
  );
}
