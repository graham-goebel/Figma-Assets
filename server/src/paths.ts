import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root — server/src/paths.ts → ../../.. */
export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

export const ASSETS_DIR = path.join(ROOT, 'assets');
export const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
export const VIDEOS_DIR = path.join(ASSETS_DIR, 'videos');
export const FONTS_DIR = path.join(ASSETS_DIR, 'fonts');
export const PROJECTS_DIR = path.join(ROOT, 'projects');
export const EXPORTS_DIR = path.join(ROOT, 'exports');

/** Create every directory the app reads from or writes to, so a fresh clone just works. */
export function ensureDirs(): void {
  for (const dir of [IMAGES_DIR, VIDEOS_DIR, FONTS_DIR, PROJECTS_DIR, EXPORTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolve `name` inside `baseDir`, refusing anything that escapes it.
 * Guards the project/export name — which comes straight from a user-typed field —
 * against `../` traversal.
 */
export function safeJoin(baseDir: string, name: string): string {
  const resolved = path.resolve(baseDir, name);
  const rel = path.relative(baseDir, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${name}`);
  }
  return resolved;
}

/** Filesystem-safe slug for user-typed names, used for both project files and export folders. */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 80);
  if (!slug) throw new Error('Name is empty after sanitising');
  return slug;
}
