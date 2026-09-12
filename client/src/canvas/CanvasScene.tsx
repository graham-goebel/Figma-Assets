import Konva from 'konva';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layer, Rect, Stage, Transformer } from 'react-konva';
import { useEnabledPlatforms, useStore } from '../state/store.ts';
import type { ImageLayer, ShapeLayer, TextLayer } from '../state/types.ts';
import CropMarks from './CropMarks.tsx';
import { ImageNode, ShapeNode, TextNode } from './nodes.tsx';

/** Set by the scene so the export pipeline can reach the live stage. */
let stageRef: Konva.Stage | null = null;
export function getStage(): Konva.Stage | null {
  return stageRef;
}

/** Overlay layer name, hidden during export so crop marks never reach a file. */
export const OVERLAY_LAYER = 'overlay-layer';

export default function CanvasScene() {
  const project = useStore((s) => s.project);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const updateLayer = useStore((s) => s.updateLayer);
  const fontsVersion = useStore((s) => s.fontsVersion);
  const platforms = useEnabledPlatforms();

  const containerRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const transformer = useRef<Konva.Transformer>(null);
  const [scale, setScale] = useState(0.2);

  const { master } = project;

  // Fit the master canvas into whatever space the centre column has.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const fit = () => {
      const pad = 48;
      const w = el.clientWidth - pad;
      const h = el.clientHeight - pad;
      if (w > 0 && h > 0) setScale(Math.min(w / master.w, h / master.h));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [master.w, master.h]);

  useEffect(() => {
    stageRef = stage.current;
    return () => {
      stageRef = null;
    };
  });

  // Point the Transformer at the selected node (or nothing).
  useEffect(() => {
    const tr = transformer.current;
    if (!tr) return;
    const node = selectedId ? (stage.current?.findOne(`#${selectedId}`) ?? null) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, project.layers]);

  return (
    <div ref={containerRef} className="canvas-host">
      <Stage
        ref={stage}
        width={master.w * scale}
        height={master.h * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => {
          // A click on empty canvas clears the selection.
          if (e.target === e.target.getStage()) select(null);
        }}
      >
        <Layer>
          <Rect x={0} y={0} width={master.w} height={master.h} fill={project.backgroundColor} />

          {project.layers.map((layer) => {
            const common = {
              interactive: true,
              onSelect: () => select(layer.id),
            };

            switch (layer.type) {
              case 'image':
                return (
                  <ImageNode
                    key={layer.id}
                    layer={layer}
                    {...common}
                    onChange={(patch) => updateLayer<ImageLayer>(layer.id, patch)}
                  />
                );
              case 'shape':
                return (
                  <ShapeNode
                    key={layer.id}
                    layer={layer}
                    {...common}
                    onChange={(patch) => updateLayer<ShapeLayer>(layer.id, patch)}
                  />
                );
              case 'text':
                return (
                  <TextNode
                    // Konva caches text metrics on the node, and re-setting an
                    // identical attribute is a no-op — so a font arriving late
                    // leaves stale fallback metrics (wrong width, wrong wrap).
                    // Keying on fontsVersion remounts text nodes to re-measure.
                    key={`${layer.id}:${fontsVersion}`}
                    layer={layer}
                    {...common}
                    onChange={(patch) => updateLayer<TextLayer>(layer.id, patch)}
                  />
                );
              default:
                return null;
            }
          })}
        </Layer>

        <Layer name={OVERLAY_LAYER}>
          <CropMarks master={master} platforms={platforms} offsets={project.cropOffsets} />
          <Transformer
            ref={transformer}
            rotateEnabled
            keepRatio={false}
            borderStroke="#3B82F6"
            borderStrokeWidth={2 / scale}
            anchorSize={10 / scale}
            anchorStroke="#3B82F6"
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
