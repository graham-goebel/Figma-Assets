import fs from 'node:fs/promises';
import archiver from 'archiver';
import type { Response } from 'express';
import { EXPORTS_DIR, safeJoin, slugify } from './paths.ts';

export type ExportFile = {
  filename: string;
  /** Base64 payload (no data: prefix). */
  data: string;
};

export type ExportResult = { dir: string; files: string[] };

/** Writes one render per platform into exports/<name>/ and returns the folder path. */
export async function writeExport(name: string, files: ExportFile[]): Promise<ExportResult> {
  const slug = slugify(name);
  const dir = safeJoin(EXPORTS_DIR, slug);
  await fs.mkdir(dir, { recursive: true });

  const written: string[] = [];
  for (const file of files) {
    // Filenames are built from platform suffixes, but they still pass through
    // the same traversal guard as everything else user-influenced.
    const target = safeJoin(dir, file.filename);
    await fs.writeFile(target, Buffer.from(file.data, 'base64'));
    written.push(file.filename);
  }

  return { dir, files: written };
}

export async function streamZip(name: string, res: Response): Promise<void> {
  const slug = slugify(name);
  const dir = safeJoin(EXPORTS_DIR, slug);

  await fs.access(dir);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => res.destroy(err));
  archive.pipe(res);
  archive.directory(dir, false);
  await archive.finalize();
}
