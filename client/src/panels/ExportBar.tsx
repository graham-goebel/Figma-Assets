import { useState } from 'react';
import { fetchProject, fetchProjects, saveProject, zipUrl } from '../api.ts';
import { exportToDisk, type ImageFormat } from '../export/exportImages.ts';
import { useEnabledPlatforms, useStore } from '../state/store.ts';
import PlatformDropdown from './PlatformDropdown.tsx';

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
  const [lastExport, setLastExport] = useState<string | null>(null);

  const busy = status.kind === 'busy';

  const handleSave = async () => {
    setStatus({ kind: 'busy', message: 'Saving…' });
    try {
      const { name } = await saveProject(project.name, project);
      setStatus({ kind: 'ok', message: `Saved as projects/${name}.json` });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  };

  const handleOpen = async () => {
    try {
      const { projects } = await fetchProjects();
      if (projects.length === 0) {
        setStatus({ kind: 'error', message: 'No saved projects yet' });
        return;
      }
      const name = window.prompt(`Open which project?\n\n${projects.map((p) => p.name).join('\n')}`);
      if (!name) return;
      setProject(await fetchProject(name));
      setStatus({ kind: 'ok', message: `Opened ${name}` });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  };

  const handleExport = async () => {
    setStatus({ kind: 'busy', message: `Rendering ${platforms.length} platform(s)…` });
    try {
      const { dir, files } = await exportToDisk(project, platforms, { format, quality });
      setLastExport(project.name);
      setStatus({ kind: 'ok', message: `${files.length} file(s) written to ${dir}` });
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
      <button type="button" onClick={handleOpen} disabled={busy}>
        Open
      </button>
      <button type="button" onClick={handleSave} disabled={busy}>
        Save
      </button>
      <button type="button" className="primary" onClick={handleExport} disabled={busy || platforms.length === 0}>
        Export {platforms.length || ''}
      </button>
      {lastExport && (
        <a className="button" href={zipUrl(lastExport)} download>
          Download .zip
        </a>
      )}

      {status.message && <span className={`status ${status.kind}`}>{status.message}</span>}
    </header>
  );
}
