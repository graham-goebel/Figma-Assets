import { Group, Line, Rect, Text } from 'react-konva';
import type { Platform } from '../platforms.ts';
import { cropRectFor, safeZone } from '../export/cropMath.ts';
import type { Point, Rect as RectType, Size } from '../state/types.ts';

type Props = {
  master: Size;
  platforms: Platform[];
  offsets: Record<string, Point>;
};

function key(rect: RectType): string {
  return [rect.x, rect.y, rect.width, rect.height].map((n) => n.toFixed(2)).join(':');
}

/**
 * Crop marks for every enabled platform, plus the universal safe zone.
 *
 * Presets that share dimensions produce the same rect, so they are drawn ONCE
 * with a combined label — four overlapping 9:16 outlines would just be noise.
 */
export default function CropMarks({ master, platforms, offsets }: Props) {
  if (platforms.length === 0) return null;

  const grouped = new Map<string, { rect: RectType; platforms: Platform[] }>();
  for (const platform of platforms) {
    const rect = cropRectFor(master, platform, offsets[platform.aspect]);
    const k = key(rect);
    const entry = grouped.get(k);
    if (entry) entry.platforms.push(platform);
    else grouped.set(k, { rect, platforms: [platform] });
  }

  const safe = platforms.length > 1 ? safeZone(master, platforms, offsets) : null;
  const markWidth = master.w * 0.0025;

  return (
    <Group listening={false}>
      {/* Everything outside the safe zone is at risk on at least one platform. */}
      {safe && (
        <>
          <Rect x={0} y={0} width={master.w} height={safe.y} fill="rgba(0,0,0,0.35)" />
          <Rect
            x={0}
            y={safe.y + safe.height}
            width={master.w}
            height={master.h - safe.y - safe.height}
            fill="rgba(0,0,0,0.35)"
          />
          <Rect x={0} y={safe.y} width={safe.x} height={safe.height} fill="rgba(0,0,0,0.35)" />
          <Rect
            x={safe.x + safe.width}
            y={safe.y}
            width={master.w - safe.x - safe.width}
            height={safe.height}
            fill="rgba(0,0,0,0.35)"
          />
          <Rect
            {...safe}
            stroke="#FFFFFF"
            strokeWidth={markWidth}
            dash={[markWidth * 6, markWidth * 6]}
            opacity={0.9}
          />
          <Text
            x={safe.x + markWidth * 4}
            y={safe.y + markWidth * 4}
            text={`SAFE ZONE  ${Math.round(safe.width)} × ${Math.round(safe.height)}`}
            fontSize={master.w * 0.014}
            fontStyle="700"
            fill="#FFFFFF"
            opacity={0.9}
          />
        </>
      )}

      {[...grouped.values()].map(({ rect, platforms: members }, index) => {
        const color = members[0].color;
        // Presets sharing a rect share one label. Spelling out all four 9:16 names
        // overflows the canvas, so name the first and count the rest.
        const label =
          members.length > 1 ? `${members[0].label} +${members.length - 1}` : members[0].label;
        const spec = `${members[0].width}×${members[0].height}`;
        const fontSize = master.w * 0.013;
        const text = `${label}  ${spec}`;
        // Crop rects are concentric, so labels would pile up on the same line.
        // Stagger by index and keep the pill inside the canvas.
        const padX = fontSize * 0.5;
        // Generous per-character estimate — a pill narrower than its text spills
        // the label onto the artwork.
        const pillW = text.length * fontSize * 0.64 + padX * 2;
        const pillH = fontSize * 1.6;
        const pillX = Math.min(rect.x, master.w - pillW);
        const pillY = Math.max(0, rect.y) + index * (pillH + fontSize * 0.25);

        return (
          <Group key={key(rect)}>
            <Rect {...rect} stroke={color} strokeWidth={markWidth * 1.5} />
            {/* Corner ticks, like film crop marks, so edges read at a glance. */}
            {[
              [rect.x, rect.y, 1, 1],
              [rect.x + rect.width, rect.y, -1, 1],
              [rect.x, rect.y + rect.height, 1, -1],
              [rect.x + rect.width, rect.y + rect.height, -1, -1],
            ].map(([cx, cy, dx, dy], i) => (
              <Line
                key={i}
                points={[cx + dx * master.w * 0.03, cy, cx, cy, cx, cy + dy * master.w * 0.03]}
                stroke={color}
                strokeWidth={markWidth * 3}
              />
            ))}
            <Rect
              x={pillX}
              y={pillY}
              width={pillW}
              height={pillH}
              fill={color}
              cornerRadius={fontSize * 0.25}
              opacity={0.95}
            />
            <Text
              x={pillX + padX}
              y={pillY + fontSize * 0.3}
              text={text}
              fontSize={fontSize}
              fontStyle="700"
              fill="#FFFFFF"
            />
          </Group>
        );
      })}
    </Group>
  );
}
