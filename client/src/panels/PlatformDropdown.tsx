import { useEffect, useRef, useState } from 'react';
import { PLATFORMS, platformsByGroup } from '../platforms.ts';
import { useStore } from '../state/store.ts';

export default function PlatformDropdown() {
  const enabled = useStore((s) => s.project.enabledPlatforms);
  const togglePlatform = useStore((s) => s.togglePlatform);
  const setEnabledPlatforms = useStore((s) => s.setEnabledPlatforms);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen((v) => !v)}>
        Crop marks
        <span className="badge">{enabled.length}</span>
        <span className="caret">▾</span>
      </button>

      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-actions">
            <button type="button" onClick={() => setEnabledPlatforms(PLATFORMS.map((p) => p.id))}>
              Select all
            </button>
            <button type="button" onClick={() => setEnabledPlatforms([])}>
              Clear
            </button>
          </div>

          {platformsByGroup().map(({ group, platforms }) => (
            <div key={group} className="dropdown-group">
              <p className="dropdown-group-title">{group}</p>
              {platforms.map((platform) => (
                <label key={platform.id} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={enabled.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  <span className="swatch" style={{ background: platform.color }} />
                  <span className="dropdown-label">{platform.label}</span>
                  <span className="muted small">
                    {platform.width}×{platform.height}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
