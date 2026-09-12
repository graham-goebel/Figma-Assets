import type Konva from 'konva';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import type { ImageLayer, Layer, ShapeLayer, TextLayer } from '../state/types.ts';
import { useImage } from './useImage.ts';

/** Rounded-rect clip, used so cornerRadius applies to image content too. */
function roundedClip(radius: number, width: number, height: number) {
  return (ctx: Konva.Context) => {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(width, 0, width, height, r);
    ctx.arcTo(width, height, 0, height, r);
    ctx.arcTo(0, height, 0, 0, r);
    ctx.arcTo(0, 0, width, 0, r);
    ctx.closePath();
  };
}

export type NodeProps<T extends Layer> = {
  layer: T;
  /** Editor-only wiring; omitted in the export pass. */
  interactive: boolean;
  onSelect?: () => void;
  onChange?: (patch: Partial<T>) => void;
};

/**
 * Shared group wrapper. Every layer type lives inside a Group positioned at the
 * layer's box, so the Transformer, rotation and clipping behave identically
 * regardless of content, and children can use local (0,0)-based coordinates.
 */
function LayerGroup<T extends Layer>({
  layer,
  interactive,
  onSelect,
  onChange,
  cornerRadius = 0,
  children,
}: NodeProps<T> & { cornerRadius?: number; children: React.ReactNode }) {
  const draggable = interactive && !layer.locked;

  return (
    <Group
      id={layer.id}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={draggable}
      listening={interactive && !layer.locked}
      clipFunc={cornerRadius > 0 ? roundedClip(cornerRadius, layer.width, layer.height) : undefined}
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange?.({ x: e.target.x(), y: e.target.y() } as Partial<T>)}
      onTransformEnd={(e) => {
        // Konva applies a transform as scale. Bake it back into width/height and
        // reset scale to 1, so the model only ever holds unscaled boxes.
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange?.({
          x: node.x(),
          y: node.y(),
          width: Math.max(8, layer.width * scaleX),
          height: Math.max(8, layer.height * scaleY),
          rotation: node.rotation(),
        } as Partial<T>);
      }}
    >
      {children}
    </Group>
  );
}

export function ImageNode(props: NodeProps<ImageLayer>) {
  const { layer } = props;
  const image = useImage(layer.src);

  if (!image) return null;

  const natural = { w: image.naturalWidth, h: image.naturalHeight };
  const box = { w: layer.width, h: layer.height };

  let draw: { x: number; y: number; width: number; height: number };
  let crop: { x: number; y: number; width: number; height: number } | undefined;

  if (layer.fit === 'cover') {
    // Fill the box and centre-crop the overflow out of the SOURCE.
    const scale = Math.max(box.w / natural.w, box.h / natural.h);
    const cropW = box.w / scale;
    const cropH = box.h / scale;
    crop = { x: (natural.w - cropW) / 2, y: (natural.h - cropH) / 2, width: cropW, height: cropH };
    draw = { x: 0, y: 0, width: box.w, height: box.h };
  } else {
    // Fit the whole image inside the box and centre it.
    const scale = Math.min(box.w / natural.w, box.h / natural.h);
    const width = natural.w * scale;
    const height = natural.h * scale;
    draw = { x: (box.w - width) / 2, y: (box.h - height) / 2, width, height };
  }

  return (
    <LayerGroup {...props} cornerRadius={layer.cornerRadius}>
      <KonvaImage image={image} crop={crop} {...draw} listening={false} />
    </LayerGroup>
  );
}

export function ShapeNode(props: NodeProps<ShapeLayer>) {
  const { layer } = props;
  return (
    <LayerGroup {...props}>
      <Rect
        x={0}
        y={0}
        width={layer.width}
        height={layer.height}
        fill={layer.fill}
        cornerRadius={layer.cornerRadius}
        listening={false}
      />
    </LayerGroup>
  );
}

export function TextNode(props: NodeProps<TextLayer>) {
  const { layer } = props;
  return (
    <LayerGroup {...props}>
      <Text
        x={0}
        y={0}
        width={layer.width}
        text={layer.text}
        fontFamily={layer.fontFamily}
        // Konva composes "{fontStyle} {fontSize}px {fontFamily}", so a numeric
        // weight passed as fontStyle yields a valid CSS font shorthand.
        fontStyle={String(layer.fontWeight)}
        fontSize={layer.fontSize}
        lineHeight={layer.lineHeight}
        letterSpacing={layer.letterSpacing}
        align={layer.align}
        fill={layer.fill}
        wrap="word"
        listening={false}
      />
    </LayerGroup>
  );
}
