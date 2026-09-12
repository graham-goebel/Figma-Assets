import { useEffect, useRef, useState } from 'react';
import { deleteProject, listProjects } from '../backend.ts';

type Props = {
  onPick: (name: string) => void;
  onClose: () => void;
};

export default function ProjectOpenMenu({ onPick, onClose }: Props) {
  const [projects, setProjects] = useState<Array<{ name: string; updatedAt: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const remove = async (name: string) => {
    await deleteProject(name);
    setProjects((prev) => prev?.filter((p) => p.name !== name) ?? null);
  };

  return (
    <div className="dropdown-menu" ref={ref}>
      {error && <p className="error small">{error}</p>}
      {!error && !projects && <p className="muted small">Loading…</p>}
      {!error && projects?.length === 0 && <p className="empty">No saved projects yet.</p>}
      {projects?.map((p) => (
        <div key={p.name} className="dropdown-item project-item">
          <button type="button" className="dropdown-label" onClick={() => onPick(p.name)}>
            {p.name}
            <span className="muted small">{new Date(p.updatedAt).toLocaleString()}</span>
          </button>
          <button type="button" className="icon-btn danger" title="Delete" onClick={() => remove(p.name)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
