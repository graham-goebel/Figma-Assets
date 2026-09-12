import type { AspectKey } from '../platforms.ts';

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type LayerType = 'image' | 'text' | 'shape' | 'video';

export type LayerBase = {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
};

export type ImageLayer = LayerBase & {
  type: 'image';
  src: string;
  /** How the source image fills its layer box. */
  fit: 'cover' | 'contain';
  cornerRadius: number;
};

export type TextLayer = LayerBase & {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSource: 'local' | 'google';
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: 'left' | 'center' | 'right';
  fill: string;
};

export type ShapeLayer = LayerBase & {
  type: 'shape';
  fill: string;
  cornerRadius: number;
};

export type VideoLayer = LayerBase & {
  type: 'video';
  src: string;
  inPoint: number;
  outPoint: number;
  muted: boolean;
  fit: 'cover' | 'contain';
};

export type Layer = ImageLayer | TextLayer | ShapeLayer | VideoLayer;

export type Project = {
  schemaVersion: 1;
  name: string;
  master: Size;
  backgroundColor: string;
  /** Index 0 is the bottom of the stack. */
  layers: Layer[];
  enabledPlatforms: string[];
  /** Keyed by aspect so every preset of that shape shares one crop window. */
  cropOffsets: Partial<Record<AspectKey, Point>>;
  createdAt: string;
  updatedAt: string;
};
