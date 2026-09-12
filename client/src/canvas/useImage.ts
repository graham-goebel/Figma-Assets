import { useEffect, useState } from 'react';

const cache = new Map<string, HTMLImageElement>();

/**
 * Loads an image for canvas use, caching per URL so re-renders and duplicated
 * layers never re-fetch. Assets are same-origin (via the Vite proxy), which is
 * what keeps the canvas untainted and therefore exportable.
 */
export function useImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() =>
    src ? cache.get(src) : undefined,
  );

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }

    const cached = cache.get(src);
    if (cached) {
      setImage(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img
      .decode()
      .then(() => {
        if (cancelled) return;
        cache.set(src, img);
        setImage(img);
      })
      .catch(() => {
        if (!cancelled) console.warn(`[canvas] failed to load image ${src}`);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

/** Await every image used by the project, so an export never races a decode. */
export async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(
    [...new Set(srcs)].map(async (src) => {
      if (cache.has(src)) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      try {
        await img.decode();
        cache.set(src, img);
      } catch {
        console.warn(`[canvas] failed to preload ${src}`);
      }
    }),
  );
}
