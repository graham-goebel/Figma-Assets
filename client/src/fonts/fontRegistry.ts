import type { FontAsset } from '../backend.ts';
import type { Layer, TextLayer } from '../state/types.ts';

/** Families registered from an uploaded font, so the picker can label them "your upload". */
const localFamilies = new Set<string>();
/** assetIds already registered as a FontFace, so re-uploads/re-lists are a no-op. */
const registeredAssetIds = new Set<string>();
/** Google families we've already injected a stylesheet for. */
const googleLinks = new Map<string, Promise<void>>();

export function isLocalFamily(family: string): boolean {
  return localFamilies.has(family);
}

/**
 * Registers every uploaded font with the document so canvas text can use it.
 * Failures are per-font: one corrupt file must not take the rest down.
 */
export async function registerLocalFonts(fonts: FontAsset[]): Promise<void> {
  await Promise.all(
    fonts
      .filter((font) => !registeredAssetIds.has(font.assetId))
      .map(async (font) => {
        try {
          const face = new FontFace(font.family, `url(${JSON.stringify(font.url)})`, {
            weight: String(font.weight),
            style: font.style,
          });
          await face.load();
          document.fonts.add(face);
          localFamilies.add(font.family);
          registeredAssetIds.add(font.assetId);
        } catch (err) {
          console.warn(`[fonts] could not register ${font.family}:`, err);
        }
      }),
  );
}

/**
 * Injects the Google Fonts stylesheet for a family and resolves once the browser
 * has actually parsed it. Cached per family so repeated selections are free.
 */
export function loadGoogleFont(family: string, weights: number[] = [400, 700]): Promise<void> {
  const cached = googleLinks.get(family);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    const axis = [...new Set(weights)].sort((a, b) => a - b).join(';');
    // display=block, NOT swap: swap deliberately paints a fallback face first, which
    // is exactly the failure mode an export must never capture.
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${axis}&display=block`;
    // Resolve on error too: a missing font should degrade to a fallback face,
    // not hang an export forever.
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn(`[fonts] failed to load Google font ${family}`);
      resolve();
    };
    document.head.appendChild(link);
  });

  googleLinks.set(family, promise);
  return promise;
}

function faceSpec(layer: TextLayer): string {
  return `${layer.fontWeight} ${Math.round(layer.fontSize)}px "${layer.fontFamily}"`;
}

/**
 * THE EXPORT GATE. A font that hasn't finished loading renders silently in a
 * fallback face and canvas gives no warning, so every export must await this first.
 *
 * Throws if a face genuinely isn't available: shipping a client deliverable
 * silently set in Arial is worse than a failed export.
 */
export async function ensureTextFontsReady(layers: Layer[]): Promise<void> {
  const textLayers = layers.filter((layer): layer is TextLayer => layer.type === 'text');
  if (textLayers.length === 0) return;

  // Make sure every Google family in use has its stylesheet in the document.
  await Promise.all(
    textLayers
      .filter((layer) => layer.fontSource === 'google')
      .map((layer) => loadGoogleFont(layer.fontFamily, [layer.fontWeight])),
  );

  // Then ask the browser to actually load each exact face we're about to draw.
  //
  // load() RESOLVES SUCCESSFULLY for a family that does not exist — it simply
  // matches zero faces — and check() likewise returns true vacuously in that case.
  // The ONLY reliable signal is the length of the FontFace[] it resolves with.
  // Every family here comes from assets/fonts (registered as a FontFace) or from
  // Google (an injected @font-face), so both are in document.fonts when present
  // and an empty match genuinely means the face is missing.
  const results = await Promise.all(
    textLayers.map(async (layer) => {
      const faces = await document.fonts.load(faceSpec(layer)).catch(() => [] as FontFace[]);
      return { layer, ok: faces.length > 0 };
    }),
  );

  await document.fonts.ready;

  const missing = [...new Set(
    results.filter((r) => !r.ok).map((r) => `${r.layer.fontFamily} ${r.layer.fontWeight}`),
  )];

  if (missing.length > 0) {
    throw new Error(
      `Font${missing.length > 1 ? 's' : ''} not available: ${missing.join(', ')}. ` +
        'Export cancelled rather than render in a fallback face.',
    );
  }
}
