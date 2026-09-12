/**
 * Everything that used to be an Express endpoint, now backed by the claude.ai
 * Artifact runtime: `assets` stores image/font bytes, `db` stores the small
 * JSON (which images/fonts exist, saved projects), `downloads` hands the
 * viewer an exported file. There is no server — this app is fully static.
 */
import * as fontkit from 'fontkit';
import { blobUrl, getAssets, getDb, getDownloads, requireCapability } from './claude.ts';
import type { Project } from './state/types.ts';

export type ImageAsset = { assetId: string; name: string; width: number; height: number; url: string; createdAt: string };
export type FontAsset = {
  assetId: string;
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  url: string;
  createdAt: string;
};

const EXTENSION_TYPES: Record<string, string> = {
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/** Font files especially often carry an empty or legacy blob.type. */
function contentTypeFor(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? EXTENSION_TYPES[ext] : undefined;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read "${file.name}" as an image`));
    };
    img.src = url;
  });
}

export async function uploadImage(file: File): Promise<ImageAsset> {
  const assets = requireCapability(await getAssets(), 'Image storage');
  const db = requireCapability(await getDb(), 'Image storage');

  const { width, height } = await readImageDimensions(file);
  const type = file.type || contentTypeFor(file);
  const { id } = await assets.upload(file, type ? { type } : undefined);

  const record: ImageAsset = {
    assetId: id,
    name: file.name,
    width,
    height,
    url: blobUrl(id),
    createdAt: new Date().toISOString(),
  };
  // The asset is orphaned until a db row points at it — write it immediately.
  await db.collection('images').doc(id).set(record);
  return record;
}

export async function listImages(): Promise<ImageAsset[]> {
  const db = await getDb();
  if (!db) return [];
  const snap = await db.collection('images').get();
  return snap.docs
    .map((d) => d.data() as ImageAsset)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteImage(assetId: string): Promise<void> {
  const [assets, db] = await Promise.all([getAssets(), getDb()]);
  await Promise.all([assets?.delete(assetId), db?.collection('images').doc(assetId).delete()]);
}

/** Reads the real family/weight/style from the font's own name table — filenames lie. */
async function readFontMeta(file: File): Promise<{ family: string; weight: number; style: 'normal' | 'italic' }> {
  const fallback = { family: file.name.replace(/\.[^.]+$/, ''), weight: 400, style: 'normal' as const };
  try {
    const buffer = await file.arrayBuffer();
    // @types/fontkit types this as Node's Buffer, but the browser build (which is
    // what actually loads here — confirmed by bundling and running it) accepts a
    // plain Uint8Array at runtime; there is no Buffer in this environment to give it.
    const loaded = fontkit.create(new Uint8Array(buffer) as unknown as Buffer);
    // A .ttc/.otc collection exposes `.fonts`; take the first face.
    const font = 'fonts' in loaded ? loaded.fonts[0] : loaded;
    if (!font) return fallback;
    return {
      family: font.familyName || fallback.family,
      weight: font['OS/2']?.usWeightClass ?? 400,
      style: font.italicAngle !== 0 ? 'italic' : 'normal',
    };
  } catch (err) {
    console.warn(`[fonts] could not parse ${file.name}, using filename as family:`, err);
    return fallback;
  }
}

export async function uploadFont(file: File): Promise<FontAsset> {
  const assets = requireCapability(await getAssets(), 'Font storage');
  const db = requireCapability(await getDb(), 'Font storage');

  const meta = await readFontMeta(file);
  const type = contentTypeFor(file);
  const { id } = await assets.upload(file, type ? { type } : undefined);

  const record: FontAsset = { assetId: id, ...meta, url: blobUrl(id), createdAt: new Date().toISOString() };
  await db.collection('fonts').doc(id).set(record);
  return record;
}

export async function listFonts(): Promise<FontAsset[]> {
  const db = await getDb();
  if (!db) return [];
  const snap = await db.collection('fonts').get();
  return snap.docs.map((d) => d.data() as FontAsset);
}

export async function deleteFont(assetId: string): Promise<void> {
  const [assets, db] = await Promise.all([getAssets(), getDb()]);
  await Promise.all([assets?.delete(assetId), db?.collection('fonts').doc(assetId).delete()]);
}

export function slugify(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Enter a name first');
  return slug;
}

export async function listProjects(): Promise<Array<{ name: string; updatedAt: string }>> {
  const db = await getDb();
  if (!db) return [];
  const snap = await db.collection('projects').get();
  return snap.docs
    .map((d) => d.data() as Project)
    .map((p) => ({ name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProject(name: string): Promise<Project | null> {
  const db = requireCapability(await getDb(), 'Projects');
  const snap = await db.doc(`projects/${slugify(name)}`).get();
  return snap.exists ? (snap.data() as Project) : null;
}

export async function saveProject(project: Project): Promise<string> {
  const db = requireCapability(await getDb(), 'Projects');
  const slug = slugify(project.name);
  await db.doc(`projects/${slug}`).set(project as unknown as Record<string, unknown>);
  return slug;
}

export async function deleteProject(name: string): Promise<void> {
  const db = await getDb();
  await db?.doc(`projects/${slugify(name)}`).delete();
}

/** Only one undecided save prompt is allowed at a time, so files go one at a time. */
export async function saveFilesIndividually(files: Array<{ filename: string; blob: Blob }>): Promise<void> {
  const downloads = requireCapability(await getDownloads(), 'Export');
  for (const file of files) {
    await downloads.save({ filename: file.filename, data: file.blob });
  }
}

export async function saveFilesAsZip(zipFilename: string, files: Array<{ filename: string; blob: Blob }>): Promise<void> {
  const downloads = requireCapability(await getDownloads(), 'Export');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const file of files) zip.file(file.filename, file.blob);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  await downloads.save({ filename: zipFilename, data: blob });
}
