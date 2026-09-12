import type { Project } from './state/types.ts';

export type AssetFile = { name: string; url: string; size: number; modified: number };
export type FontAsset = AssetFile & { family: string; weight: number; style: 'normal' | 'italic' };
export type GoogleFont = { family: string; category: string; weights: number[]; italics: boolean };

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchAssets(): Promise<{ images: AssetFile[]; videos: AssetFile[]; fonts: FontAsset[] }> {
  return request('/api/assets');
}

export function fetchGoogleFonts(): Promise<{ fonts: GoogleFont[]; error?: string }> {
  return request('/api/fonts/google');
}

export function fetchProjects(): Promise<{ projects: Array<{ name: string; modified: number }> }> {
  return request('/api/projects');
}

export function fetchProject(name: string): Promise<Project> {
  return request(`/api/projects/${encodeURIComponent(name)}`);
}

export function saveProject(name: string, project: Project): Promise<{ name: string }> {
  return postJson('/api/projects', { name, project });
}

export function postImageExport(
  name: string,
  files: Array<{ filename: string; data: string }>,
): Promise<{ dir: string; files: string[] }> {
  return postJson('/api/export/images', { name, files });
}

export function zipUrl(name: string): string {
  return `/api/export/${encodeURIComponent(name)}/zip`;
}
