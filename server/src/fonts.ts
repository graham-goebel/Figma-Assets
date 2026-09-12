import { FALLBACK_GOOGLE_FONTS } from './googleFontsFallback.ts';

export type GoogleFont = {
  family: string;
  category: string;
  /** Weights available, e.g. [400, 700]. */
  weights: number[];
  italics: boolean;
};

type Cache = { at: number; fonts: GoogleFont[] };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cache: Cache | null = null;

/**
 * Google's public font metadata endpoint. Unlike the Developer API it needs no key,
 * but it prefixes the JSON with an XSSI guard that has to be stripped.
 */
const METADATA_URL = 'https://fonts.googleapis.com/metadata/fonts';

type MetadataResponse = {
  familyMetadataList?: Array<{
    family: string;
    category?: string;
    fonts?: Record<string, unknown>;
  }>;
};

function parseAxes(fonts: Record<string, unknown> | undefined): Pick<GoogleFont, 'weights' | 'italics'> {
  // Keys look like "400", "700i" — the trailing "i" marks the italic face.
  const weights = new Set<number>();
  let italics = false;

  for (const key of Object.keys(fonts ?? {})) {
    if (key.endsWith('i')) italics = true;
    const weight = Number.parseInt(key, 10);
    if (Number.isFinite(weight)) weights.add(weight);
  }

  return {
    weights: weights.size ? [...weights].sort((a, b) => a - b) : [400],
    italics,
  };
}

/**
 * Returns the Google Fonts catalogue, cached for a day.
 *
 * Falls back to a bundled curated list when the metadata endpoint is unreachable
 * (offline, restricted network, proxy). The css2 stylesheet those families load
 * from is a different endpoint and usually still works, so the picker stays
 * useful rather than collapsing to local fonts only.
 */
export async function getGoogleFonts(): Promise<{ fonts: GoogleFont[]; error?: string }> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return { fonts: cache.fonts };

  try {
    const res = await fetch(METADATA_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const json = text.slice(text.indexOf('{'));
    const data = JSON.parse(json) as MetadataResponse;

    const fonts: GoogleFont[] = (data.familyMetadataList ?? []).map((entry) => ({
      family: entry.family,
      category: entry.category ?? 'sans-serif',
      ...parseAxes(entry.fonts),
    }));

    cache = { at: Date.now(), fonts };
    return { fonts };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    // Serve a stale cache if we have one — better than nothing.
    if (cache) return { fonts: cache.fonts, error };
    return {
      fonts: FALLBACK_GOOGLE_FONTS,
      error: `${error} — showing a bundled list of ${FALLBACK_GOOGLE_FONTS.length} popular families`,
    };
  }
}
