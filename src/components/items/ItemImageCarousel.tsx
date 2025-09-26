'use client';

import { ImageOff } from 'lucide-react';
import { useState } from 'react';


type ItemImageCarouselProps = {
  images: string[];
  title: string;
};

export default function ItemImageCarousel({ images, title }: ItemImageCarouselProps) {
  const safeImages = images.length > 0 ? images : [];
  const [index, setIndex] = useState(0);
  const current = safeImages[Math.min(index, Math.max(safeImages.length - 1, 0))];

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-hover)]">
        {current ? (
          <img src={current} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="size-10 text-[var(--muted)]" aria-hidden />
          </div>
        )}
      </div>
      {safeImages.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((image, i) => (
            <button
              key={`${image}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border transition ${i === index ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(124,58,237,0.25)]' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[var(--surface-hover)]">
                  <ImageOff className="size-5 text-[var(--muted)]" aria-hidden />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
