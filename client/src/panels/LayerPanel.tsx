import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../state/store.ts';
import type { Layer } from '../state/types.ts';

const TYPE_ICON: Record<Layer['type'], string> = {
  image: '▣',
  text: 'T',
  shape: '◼',
  video: '▶',
};

function LayerRow({ layer }: { layer: Layer }) {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const updateLayer = useStore((s) => s.updateLayer);
  const duplicateLayer = useStore((s) => s.duplicateLayer);
  const removeLayer = useStore((s) => s.removeLayer);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`layer-row${selectedId === layer.id ? ' is-selected' : ''}`}
      onMouseDown={() => select(layer.id)}
    >
      <button className="grip" {...attributes} {...listeners} title="Drag to reorder" type="button">
        ⠿
      </button>
      <span className="layer-icon">{TYPE_ICON[layer.type]}</span>
      <input
        className="layer-name"
        value={layer.name}
        onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
      />
      <button
        type="button"
        className="icon-btn"
        title={layer.visible ? 'Hide' : 'Show'}
        onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
      >
        {layer.visible ? '👁' : '🚫'}
      </button>
      <button
        type="button"
        className="icon-btn"
        title={layer.locked ? 'Unlock' : 'Lock'}
        onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>
      <button
        type="button"
        className="icon-btn"
        title="Duplicate"
        onClick={() => duplicateLayer(layer.id)}
      >
        ⧉
      </button>
      <button type="button" className="icon-btn danger" title="Delete" onClick={() => removeLayer(layer.id)}>
        ✕
      </button>
    </li>
  );
}

export default function LayerPanel() {
  const layers = useStore((s) => s.project.layers);
  const reorderLayers = useStore((s) => s.reorderLayers);
  const addTextLayer = useStore((s) => s.addTextLayer);
  const addShapeLayer = useStore((s) => s.addShapeLayer);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // The panel reads front-to-back, the model is stored bottom-first.
  // This reverse, and the one in handleDragEnd, are the ONLY two places that flip.
  const visual = [...layers].reverse();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = visual.findIndex((l) => l.id === active.id);
    const to = visual.findIndex((l) => l.id === over.id);
    if (from === -1 || to === -1) return;

    const next = [...visual];
    next.splice(to, 0, ...next.splice(from, 1));
    reorderLayers(next.reverse());
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Layers</h2>
        <div className="panel-actions">
          <button type="button" onClick={() => addTextLayer()}>
            + Text
          </button>
          <button type="button" onClick={addShapeLayer}>
            + Shape
          </button>
        </div>
      </header>

      {layers.length === 0 ? (
        <p className="empty">Click an image to add your first layer.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visual.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="layer-list">
              {visual.map((layer) => (
                <LayerRow key={layer.id} layer={layer} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
