import fs from 'node:fs/promises';
import path from 'node:path';
import { PROJECTS_DIR, safeJoin, slugify } from './paths.ts';

export type ProjectSummary = { name: string; modified: number };

function fileFor(name: string): string {
  return safeJoin(PROJECTS_DIR, `${slugify(name)}.json`);
}

export async function listProjects(): Promise<ProjectSummary[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(PROJECTS_DIR);
  } catch {
    return [];
  }

  const summaries: ProjectSummary[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const stat = await fs.stat(path.join(PROJECTS_DIR, entry)).catch(() => null);
    if (!stat?.isFile()) continue;
    summaries.push({ name: path.basename(entry, '.json'), modified: stat.mtimeMs });
  }
  return summaries.sort((a, b) => b.modified - a.modified);
}

export async function readProject(name: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(name), 'utf8'));
  } catch {
    return null;
  }
}

export async function writeProject(name: string, project: unknown): Promise<string> {
  const slug = slugify(name);
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  await fs.writeFile(fileFor(slug), JSON.stringify(project, null, 2), 'utf8');
  return slug;
}

export async function deleteProject(name: string): Promise<boolean> {
  try {
    await fs.unlink(fileFor(name));
    return true;
  } catch {
    return false;
  }
}
