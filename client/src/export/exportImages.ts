import type Konva from 'konva';
import { OVERLAY_LAYER, getStage } from '../canvas/CanvasScene.tsx';
import { preloadImages } from '../canvas/useImage.ts';
import { ensureTextFontsReady } from '../fonts/fontRegistry.ts';
import type { Platform } from '../platforms.ts';
import { renderKey } from '../platforms.ts';
import { postImageExport } from '../api.ts';
import type { Project, Rect } from '../state/types.ts';
import { cropRectFor } from './cropMath.ts';

export type ImageFormat = 'png' | 'jpeg';

export type ExportOptions = {
  format: ImageFormat;
  /** JPEG only, 0..1. */
  quality: number;
};

export type ExportedFile = { filename: string; blob: Blob; platform: Platform };

function extensionFor(format: ImageFormat): string {
  return format === 'png' ? 'png' : 'jpg';
}

function sanitiseBaseName(name: string): string {
  const clean = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!clean) throw new Error('Enter a name for the export');
  return clean;
}

/**
 * Rasterises the crop rect at exactly `platform.width x platform.height`.
 *
 * SYNCHRONOUS ON PURPOSE — see renderAllPlatforms.
 *
 * Konva sizes its backing store as round(width * pixelRatio), so a crop rect of
 * 1692.9px can come out 627 OR 628 depending on float noise. Drawing the result
 * into an exactly-sized canvas costs microseconds and makes the output dimensions
 * provably correct. Do not remove this second pass.
 */
function rasterise(stage: Konva.Stage, rect: Rect, platform: Platform): HTMLCanvasElement {
  const source = stage.toCanvas({
    ...rect,
    pixelRatio: platform.width / rect.width,
  }) as HTMLCanvasElement;

  const out = document.createElement('canvas');
  out.width = platform.width;
  out.height = platform.height;

  // alpha:false — the background is always opaque, and it keeps JPEG from
  // compositing transparency onto black.
  const ctx = out.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get a 2D context for export');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, platform.width, platform.height);
  return out;
}

function encode(canvas: HTMLCanvasElement, options: ExportOptions, label: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Failed to encode ${label}`))),
      options.format === 'png' ? 'image/png' : 'image/jpeg',
      options.format === 'jpeg' ? options.quality : undefined,
    ),
  );
}

/**
 * Renders every enabled platform. Presets sharing a render key produce identical
 * pixels, so they are rendered and encoded ONCE and the blob is reused — the four
 * 9:16 presets cost one render, not four.
 */
export async function renderAllPlatforms(
  project: Project,
  platforms: Platform[],
  options: ExportOptions,
): Promise<ExportedFile[]> {
  if (platforms.length === 0) throw new Error('Select at least one platform to export');

  const stage = getStage();
  if (!stage) throw new Error('Canvas is not ready');

  // Everything must be decoded and loaded BEFORE we rasterise.
  await preloadImages(
    project.layers.flatMap((layer) => (layer.type === 'image' || layer.type === 'video' ? [layer.src] : [])),
  );
  await ensureTextFontsReady(project.layers);

  const base = sanitiseBaseName(project.name);
  const overlay = stage.findOne(`.${OVERLAY_LAYER}`);

  // ---------------------------------------------------------------------------
  // Pass 1: rasterise EVERYTHING synchronously, with no await anywhere in between.
  //
  // The stage is temporarily taken out of its on-screen state (viewport zoom reset,
  // crop marks and transform handles hidden) so the export is independent of how
  // the user happens to be looking at the canvas. That override only survives until
  // React next renders the Stage — react-konva would reset width/height/scale from
  // props. Awaiting between platforms therefore corrupted every render after the
  // first. Keeping this block synchronous makes an interleaved re-render impossible.
  // ---------------------------------------------------------------------------
  const savedScale = stage.scale();
  const savedPosition = stage.position();
  const savedSize = { width: stage.width(), height: stage.height() };

  const canvases = new Map<string, HTMLCanvasElement>();

  try {
    overlay?.visible(false);
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.size({ width: project.master.w, height: project.master.h });

    for (const platform of platforms) {
      // Presets sharing a render key produce identical pixels — rasterise once.
      const key = renderKey(platform);
      if (canvases.has(key)) continue;
      const rect = cropRectFor(project.master, platform, project.cropOffsets[platform.aspect]);
      canvases.set(key, rasterise(stage, rect, platform));
    }
  } finally {
    // Always restore, even if a rasterise threw.
    stage.size(savedSize);
    stage.scale(savedScale);
    stage.position(savedPosition);
    overlay?.visible(true);
    stage.batchDraw();
  }

  // Pass 2: encoding is async, but the pixels are already captured, so the stage
  // is free to go back to being a live editor.
  const blobs = new Map<string, Blob>();
  for (const [key, canvas] of canvases) {
    blobs.set(key, await encode(canvas, options, key));
  }

  return platforms.map((platform) => ({
    filename: `${base}${platform.suffix}.${extensionFor(options.format)}`,
    blob: blobs.get(renderKey(platform))!,
    platform,
  }));
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Renders, then writes the files into exports/<name>/ on disk. */
export async function exportToDisk(
  project: Project,
  platforms: Platform[],
  options: ExportOptions,
): Promise<{ dir: string; files: ExportedFile[] }> {
  const files = await renderAllPlatforms(project, platforms, options);

  const payload = await Promise.all(
    files.map(async (file) => ({ filename: file.filename, data: await blobToBase64(file.blob) })),
  );

  const result = await postImageExport(sanitiseBaseName(project.name), payload);
  return { dir: result.dir, files };
}
