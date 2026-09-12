import { useStore } from '../state/store.ts';
import type { ImageLayer, ShapeLayer, TextLayer } from '../state/types.ts';
import FontPicker from './FontPicker.tsx';

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <span className="color-input">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export default function PropertiesPanel() {
  const project = useStore((s) => s.project);
  const selectedId = useStore((s) => s.selectedId);
  const updateLayer = useStore((s) => s.updateLayer);
  const setBackgroundColor = useStore((s) => s.setBackgroundColor);

  const layer = project.layers.find((l) => l.id === selectedId);

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Properties</h2>
      </header>

      <ColorField label="Canvas background" value={project.backgroundColor} onChange={setBackgroundColor} />
      <p className="muted small">
        Master canvas {project.master.w} × {project.master.h}
      </p>

      {!layer ? (
        <p className="empty">Select a layer to edit it.</p>
      ) : (
        <>
          <hr />
          <p className="field-label">{layer.name}</p>

          <div className="grid-2">
            <NumberField label="X" value={layer.x} onChange={(x) => updateLayer(layer.id, { x })} />
            <NumberField label="Y" value={layer.y} onChange={(y) => updateLayer(layer.id, { y })} />
            <NumberField
              label="Width"
              value={layer.width}
              min={8}
              onChange={(width) => updateLayer(layer.id, { width })}
            />
            <NumberField
              label="Height"
              value={layer.height}
              min={8}
              onChange={(height) => updateLayer(layer.id, { height })}
            />
            <NumberField
              label="Rotation"
              value={layer.rotation}
              step={1}
              onChange={(rotation) => updateLayer(layer.id, { rotation })}
            />
            <NumberField
              label="Opacity"
              value={layer.opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(opacity) => updateLayer(layer.id, { opacity })}
            />
          </div>

          {layer.type === 'text' && (
            <>
              <label>
                <span>Text</span>
                <textarea
                  rows={3}
                  value={layer.text}
                  onChange={(e) => updateLayer<TextLayer>(layer.id, { text: e.target.value })}
                />
              </label>
              <FontPicker layer={layer} onChange={(patch) => updateLayer<TextLayer>(layer.id, patch)} />
              <div className="grid-2">
                <NumberField
                  label="Size"
                  value={layer.fontSize}
                  min={8}
                  onChange={(fontSize) => updateLayer<TextLayer>(layer.id, { fontSize })}
                />
                <NumberField
                  label="Line height"
                  value={layer.lineHeight}
                  min={0.5}
                  step={0.05}
                  onChange={(lineHeight) => updateLayer<TextLayer>(layer.id, { lineHeight })}
                />
                <NumberField
                  label="Letter spacing"
                  value={layer.letterSpacing}
                  step={0.5}
                  onChange={(letterSpacing) => updateLayer<TextLayer>(layer.id, { letterSpacing })}
                />
                <label>
                  <span>Align</span>
                  <select
                    value={layer.align}
                    onChange={(e) =>
                      updateLayer<TextLayer>(layer.id, { align: e.target.value as TextLayer['align'] })
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
              <ColorField
                label="Text color"
                value={layer.fill}
                onChange={(fill) => updateLayer<TextLayer>(layer.id, { fill })}
              />
            </>
          )}

          {layer.type === 'image' && (
            <div className="grid-2">
              <label>
                <span>Fit</span>
                <select
                  value={layer.fit}
                  onChange={(e) =>
                    updateLayer<ImageLayer>(layer.id, { fit: e.target.value as ImageLayer['fit'] })
                  }
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </label>
              <NumberField
                label="Corner radius"
                value={layer.cornerRadius}
                min={0}
                onChange={(cornerRadius) => updateLayer<ImageLayer>(layer.id, { cornerRadius })}
              />
            </div>
          )}

          {layer.type === 'shape' && (
            <>
              <ColorField
                label="Fill"
                value={layer.fill}
                onChange={(fill) => updateLayer<ShapeLayer>(layer.id, { fill })}
              />
              <NumberField
                label="Corner radius"
                value={layer.cornerRadius}
                min={0}
                onChange={(cornerRadius) => updateLayer<ShapeLayer>(layer.id, { cornerRadius })}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
