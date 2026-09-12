/**
 * Thin, typed access to the claude.ai Artifact runtime capabilities this app
 * uses: `assets` (image/font storage), `db` (projects), `downloads` (export).
 *
 * `window.claude` only exists when this page is actually being viewed inside
 * a claude.ai Artifact frame — running it any other way (a plain `vite dev`
 * tab, a saved copy of the file) has no `window.claude` at all, and every
 * capability below resolves null. The whole app is written to degrade to a
 * clear "isn't available here" message in that case, never a crash.
 */

export type AssetsApi = {
  upload(
    blob: Blob,
    options?: { type?: string },
  ): Promise<{ id: string; url: string; sizeBytes: number; contentType: string }>;
  list(): Promise<{
    assets: Array<{ id: string; url: string; contentType: string; sizeBytes: number; createdAt: string }>;
    usage: { files: number; bytes: number; maxFiles: number; maxBytes: number };
  }>;
  delete(ref: string): Promise<{ deleted: boolean }>;
};

export type DocSnapshot = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
export type DocRef = {
  id: string;
  path: string;
  get(): Promise<DocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  collection(path: string): CollectionRef;
};
export type QuerySnapshot = { docs: DocSnapshot[] };
export type CollectionRef = {
  doc(id?: string): DocRef;
  get(): Promise<QuerySnapshot>;
};
export type DbApi = {
  doc(path: string): DocRef;
  collection(path: string): CollectionRef;
};

export type DownloadsApi = {
  save(request: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: 'saved' | 'delivered' }>;
};

type ClaudeGlobal = { use: <T>(name: string) => Promise<T | null> };

declare global {
  interface Window {
    claude?: ClaudeGlobal;
  }
}

async function use<T>(name: string): Promise<T | null> {
  if (typeof window === 'undefined' || !window.claude) return null;
  try {
    return (await window.claude.use<T>(name)) ?? null;
  } catch {
    return null;
  }
}

export const getAssets = (): Promise<AssetsApi | null> => use<AssetsApi>('assets');
export const getDb = (): Promise<DbApi | null> => use<DbApi>('db');
export const getDownloads = (): Promise<DownloadsApi | null> => use<DownloadsApi>('downloads');

/** The stable, cross-view URL for a stored asset — derivable from its id alone. */
export function blobUrl(assetId: string): string {
  return `/_blob/${assetId}`;
}

/** Thrown by backend.ts helpers when a required capability is unavailable. */
export class CapabilityError extends Error {}

export function requireCapability<T>(cap: T | null, what: string): T {
  if (!cap) {
    throw new CapabilityError(
      `${what} isn't available in this view — open this app from its claude.ai link to use it.`,
    );
  }
  return cap;
}
