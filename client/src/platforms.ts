export type AspectKey = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1' | '2:3';

export type Platform = {
  id: string;
  /** Shown in the dropdown. */
  label: string;
  /** Network grouping for the dropdown. */
  group: string;
  width: number;
  height: number;
  /** Crop offsets are shared per aspect, so all four 9:16 presets move together. */
  aspect: AspectKey;
  /** Appended to the user's base name, e.g. "summer-sale" + "_instagram". */
  suffix: string;
  /** Outline colour for this platform's crop marks. */
  color: string;
};

export const MASTER_SIZE = { w: 2160, h: 2160 } as const;

/**
 * The master is square and large enough that every preset below is a DOWNSCALE of it:
 * it must cover the widest output (1600) and the tallest (1920). 2160 is used rather
 * than the 1920 minimum because it is exactly 2x the 1080 base most presets share.
 */
export const PLATFORMS: Platform[] = [
  { id: 'ig-feed',      label: 'Instagram Feed',      group: 'Instagram', width: 1080, height: 1080, aspect: '1:1',     suffix: '_instagram',           color: '#E1306C' },
  { id: 'ig-portrait',  label: 'Instagram Portrait',  group: 'Instagram', width: 1080, height: 1350, aspect: '4:5',     suffix: '_instagram_portrait',  color: '#C13584' },
  { id: 'ig-story',     label: 'Instagram Story',     group: 'Instagram', width: 1080, height: 1920, aspect: '9:16',    suffix: '_instagram_story',     color: '#833AB4' },
  { id: 'fb-feed',      label: 'Facebook Feed',       group: 'Facebook',  width: 1080, height: 1080, aspect: '1:1',     suffix: '_facebook',            color: '#1877F2' },
  { id: 'fb-link',      label: 'Facebook Link',       group: 'Facebook',  width: 1200, height: 630,  aspect: '1.91:1',  suffix: '_facebook_link',       color: '#0E5FC0' },
  { id: 'fb-story',     label: 'Facebook Story',      group: 'Facebook',  width: 1080, height: 1920, aspect: '9:16',    suffix: '_facebook_story',      color: '#4267B2' },
  { id: 'x',            label: 'X / Twitter',         group: 'X',         width: 1600, height: 900,  aspect: '16:9',    suffix: '_x',                   color: '#14171A' },
  { id: 'li-link',      label: 'LinkedIn Link',       group: 'LinkedIn',  width: 1200, height: 627,  aspect: '1.91:1',  suffix: '_linkedin',            color: '#0A66C2' },
  { id: 'li-square',    label: 'LinkedIn Square',     group: 'LinkedIn',  width: 1080, height: 1080, aspect: '1:1',     suffix: '_linkedin_square',     color: '#004182' },
  { id: 'tiktok',       label: 'TikTok',              group: 'TikTok',    width: 1080, height: 1920, aspect: '9:16',    suffix: '_tiktok',              color: '#00F2EA' },
  { id: 'yt-shorts',    label: 'YouTube Shorts',      group: 'YouTube',   width: 1080, height: 1920, aspect: '9:16',    suffix: '_youtube_shorts',      color: '#FF0000' },
  { id: 'pinterest',    label: 'Pinterest',           group: 'Pinterest', width: 1000, height: 1500, aspect: '2:3',     suffix: '_pinterest',           color: '#E60023' },
];

export const PLATFORMS_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function platformsByGroup(): Array<{ group: string; platforms: Platform[] }> {
  const groups = new Map<string, Platform[]>();
  for (const platform of PLATFORMS) {
    const list = groups.get(platform.group) ?? [];
    list.push(platform);
    groups.set(platform.group, list);
  }
  return [...groups].map(([group, platforms]) => ({ group, platforms }));
}

/**
 * Presets that share output dimensions also share an aspect, so they render to
 * identical pixels — render once under this key, then write a file per platform.
 */
export function renderKey(platform: Platform): string {
  return `${platform.width}x${platform.height}`;
}
