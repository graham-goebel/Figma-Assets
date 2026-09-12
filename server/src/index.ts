import cors from 'cors';
import express from 'express';
import { listFonts, listImages, listVideos } from './assets.ts';
import { type ExportFile, streamZip, writeExport } from './exporter.ts';
import { getGoogleFonts } from './fonts.ts';
import { EXPORTS_DIR, FONTS_DIR, IMAGES_DIR, VIDEOS_DIR, ensureDirs } from './paths.ts';
import { deleteProject, listProjects, readProject, writeProject } from './projects.ts';

const PORT = Number(process.env.PORT ?? 5174);

ensureDirs();

const app = express();
app.use(cors());
// Exports arrive as base64 in a single JSON body: twelve 2160px renders need real headroom.
app.use(express.json({ limit: '512mb' }));

// Assets are served same-origin (through the Vite proxy in dev) so the canvas is
// never tainted and stage.toCanvas() stays exportable.
app.use('/assets/images', express.static(IMAGES_DIR));
app.use('/assets/videos', express.static(VIDEOS_DIR));
app.use('/assets/fonts', express.static(FONTS_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/assets', async (_req, res, next) => {
  try {
    const [images, videos, fonts] = await Promise.all([listImages(), listVideos(), listFonts()]);
    res.json({ images, videos, fonts });
  } catch (err) {
    next(err);
  }
});

app.get('/api/fonts/google', async (_req, res, next) => {
  try {
    res.json(await getGoogleFonts());
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects', async (_req, res, next) => {
  try {
    res.json({ projects: await listProjects() });
  } catch (err) {
    next(err);
  }
});

app.get('/api/projects/:name', async (req, res, next) => {
  try {
    const project = await readProject(req.params.name);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

app.post('/api/projects', async (req, res, next) => {
  try {
    const { name, project } = req.body as { name?: string; project?: unknown };
    if (!name || !project) {
      res.status(400).json({ error: 'name and project are required' });
      return;
    }
    res.json({ name: await writeProject(name, project) });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/projects/:name', async (req, res, next) => {
  try {
    res.json({ deleted: await deleteProject(req.params.name) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/export/images', async (req, res, next) => {
  try {
    const { name, files } = req.body as { name?: string; files?: ExportFile[] };
    if (!name || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'name and a non-empty files array are required' });
      return;
    }
    res.json(await writeExport(name, files));
  } catch (err) {
    next(err);
  }
});

app.get('/api/export/:name/zip', async (req, res, next) => {
  try {
    await streamZip(req.params.name, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(404).json({ error: 'No exports found for that name' });
      return;
    }
    next(err);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error('[server]', message);
  if (!res.headersSent) res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] assets: ${IMAGES_DIR}`);
  console.log(`[server] exports: ${EXPORTS_DIR}`);
});
