import { useEffect, useState } from 'react';
import { loadProject, saveProject } from '../backend.ts';
import { exportAndSaveFiles, exportAndSaveZip, type ImageFormat } from '../export/exportImages.ts';
import { useEnabledPlatforms, useStore } from '../state/store.ts';
import PlatformDropdown from './PlatformDropdown.tsx';
import ProjectOpenMenu from './ProjectOpenMenu.tsx';

type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; message?: string };

export default function ExportBar() {
  const project = useStore((s) => s.project);
  const setName = useStore((s) => s.setName);
  const setProject = useStore((s) => s.setProject);
  const newProject = useStore((s) => s.newProject);
  const platforms = useEnabledPlatforms();

  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [openMenu, setOpenMenu] = useState(false);

  const busy = status.kind === 'busy';

  // Clear a stale error/success line once the user starts changing things again.
  useEffect(() => {
    if (status.kind === 'ok' || status.kind === 'error') {
      const t = setTimeout(() => setStatus({ kind: 'idle' }), 6000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleSave = async () => {
    setStatus({ kind: 'busy', message: 'Saving…' });
    try {
      await saveProject(project);
      setStatus({ kind: 'ok', message: `Saved "${project.name}"` });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  };

  const handleOpenProject = async (name: string) => {
    setOpenMenu(false);
    setStatus({ kind: 'busy', message: `Opening "${name}"…` });
    try {
      const loaded = await loadProject(name);
      if (!loaded) {
        setStatus({ kind: 'error', message: `Project "${name}" not found` });
        return;
      }
      setProject(loaded);
      setStatus({ kind: 'ok', message: `Opened "${name}"` });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  };

  const handleExport = async (asZip: boolean) => {
    setStatus({ kind: 'busy', message: `Rendering ${platforms.length} platform(s)…` });
    try {
      const files = asZip
        ? await exportAndSaveZip(project, platforms, { format, quality })
        : await exportAndSaveFiles(project, platforms, { format, quality });
      setStatus({ kind: 'ok', message: `${files.length} file(s) ready to save` });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  };

  return (
    <header className="topbar">
      <div className="brand">Social Post Composer</div>

      <label className="name-field">
        <span>Name</span>
        <input
          value={project.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="summer-sale"
          spellCheck={false}
        />
      </label>

      <PlatformDropdown />

      <label className="inline">
        <span>Format</span>
        <select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
        </select>
      </label>

      {format === 'jpeg' && (
        <label className="inline">
          <span>Quality {Math.round(quality * 100)}</span>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
        </label>
      )}

      <div className="spacer" />

      <button type="button" onClick={newProject} disabled={busy}>
        New
      </button>
      <div className="dropdown">
        <button type="button" onClick={() => setOpenMenu((v) => !v)} disabled={busy}>
          Open
        </button>
        {openMenu && <ProjectOpenMenu onPick={handleOpenProject} onClose={() => setOpenMenu(false)} />}
      </div>
      <button type="button" onClick={handleSave} disabled={busy}>
        Save
      </button>
      <button
        type="button"
        onClick={() => handleExport(true)}
        disabled={busy || platforms.length === 0}
        title="Save all files as one .zip"
      >
        Zip
      </button>
      <button
        type="button"
        className="primary"
        onClick={() => handleExport(false)}
        disabled={busy || platforms.length === 0}
      >
        Export {platforms.length || ''}
      </button>

      {status.message && <span className={`status ${status.kind}`}>{status.message}</span>}
    </header>
  );
}
