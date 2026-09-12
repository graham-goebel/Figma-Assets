import fs from 'node:fs/promises';
import path from 'node:path';
import * as fontkit from 'fontkit';
import { FONTS_DIR, IMAGES_DIR, VIDEOS_DIR } from './paths.ts';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const FONT_EXT = new Set(['.ttf', '.otf', '.woff2', '.woff']);

export type AssetFile = {
  /** Filename, also the id. */
  name: string;
  /** Same-origin URL the client loads — keeps the canvas untainted so export works. */
  url: string;
  size: number;
  modified: number;
};

export type FontAsset = AssetFile & {
  /** Real family name from the font's name table, not the filename. */
  family: string;
  weight: number;
  style: 'normal' | 'italic';
};

async function listDir(dir: string, exts: Set<string>, urlPrefix: string): Promise<AssetFile[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const files: AssetFile[] = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    if (!exts.has(path.extname(name).toLowerCase())) continue;
    const stat = await fs.stat(path.join(dir, name)).catch(() => null);
    if (!stat?.isFile()) continue;
    files.push({
      name,
      url: `${urlPrefix}/${encodeURIComponent(name)}`,
      size: stat.size,
      modified: stat.mtimeMs,
    });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export function listImages(): Promise<AssetFile[]> {
  return listDir(IMAGES_DIR, IMAGE_EXT, '/assets/images');
}

export function listVideos(): Promise<AssetFile[]> {
  return listDir(VIDEOS_DIR, VIDEO_EXT, '/assets/videos');
}

/**
 * Font filenames lie ("Inter-Bold.ttf" may contain family "Inter Tight"), and the family
 * name is what CSS/canvas matches on — so read it out of the font's own name table.
 */
export async function listFonts(): Promise<FontAsset[]> {
  const files = await listDir(FONTS_DIR, FONT_EXT, '/assets/fonts');

  return Promise.all(
    files.map(async (file): Promise<FontAsset> => {
      const fallback: FontAsset = {
        ...file,
        family: path.basename(file.name, path.extname(file.name)),
        weight: 400,
        style: 'normal',
      };

      try {
        const loaded = fontkit.openSync(path.join(FONTS_DIR, file.name));
        // A .ttc/.otc collection exposes `.fonts`; take the first face.
        const font = 'fonts' in loaded ? loaded.fonts[0] : loaded;
        if (!font) return fallback;

        return {
          ...file,
          family: font.familyName || fallback.family,
          weight: font['OS/2']?.usWeightClass ?? 400,
          style: font.italicAngle !== 0 ? 'italic' : 'normal',
        };
      } catch {
        // Unparseable font (or a woff2 fontkit can't decompress) still shows up,
        // just under its filename.
        return fallback;
      }
    }),
  );
}
