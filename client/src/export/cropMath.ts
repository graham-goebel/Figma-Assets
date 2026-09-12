import type { Platform } from '../platforms.ts';
import type { Point, Rect, Size } from '../state/types.ts';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The largest rect of the given aspect ratio that fits inside the master, centred,
 * then shifted by the user's offset and clamped so it can never leave the master.
 */
export function cropRect(master: Size, aspect: number, offset: Point = { x: 0, y: 0 }): Rect {
  const width = Math.min(master.w, master.h * aspect);
  const height = width / aspect;
  return {
    x: clamp((master.w - width) / 2 + offset.x, 0, master.w - width),
    y: clamp((master.h - height) / 2 + offset.y, 0, master.h - height),
    width,
    height,
  };
}

export function cropRectFor(master: Size, platform: Platform, offset?: Point): Rect {
  return cropRect(master, platform.width / platform.height, offset);
}

/**
 * The region every enabled platform keeps: the intersection of their crop rects.
 * Anything inside this survives every crop, so the UI can shade the rest.
 */
export function safeZone(master: Size, platforms: Platform[], offsets: Record<string, Point>): Rect | null {
  if (platforms.length === 0) return null;

  let left = 0;
  let top = 0;
  let right = master.w;
  let bottom = master.h;

  for (const platform of platforms) {
    const rect = cropRectFor(master, platform, offsets[platform.aspect]);
    left = Math.max(left, rect.x);
    top = Math.max(top, rect.y);
    right = Math.min(right, rect.x + rect.width);
    bottom = Math.min(bottom, rect.y + rect.height);
  }

  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}
