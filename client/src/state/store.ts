import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { MASTER_SIZE, PLATFORMS } from '../platforms.ts';
import type { AspectKey, Platform } from '../platforms.ts';
import type { ImageLayer, Layer, Point, Project, ShapeLayer, TextLayer, VideoLayer } from './types.ts';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

export function emptyProject(): Project {
  return {
    schemaVersion: 1,
    name: 'untitled',
    master: { ...MASTER_SIZE },
    backgroundColor: '#111827',
    layers: [],
    enabledPlatforms: ['ig-feed', 'ig-story', 'fb-link', 'x'],
    cropOffsets: {},
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Centres a box of the given aspect ratio in the master at `fraction` of its width. */
function centredBox(aspect: number, fraction = 0.6) {
  const width = MASTER_SIZE.w * fraction;
  const height = width / aspect;
  return {
    x: (MASTER_SIZE.w - width) / 2,
    y: (MASTER_SIZE.h - height) / 2,
    width,
    height,
  };
}

type Store = {
  project: Project;
  selectedId: string | null;
  /**
   * Bumped whenever fonts finish loading. Text nodes are keyed on it so they
   * remount and re-measure — Konva caches text metrics and will otherwise keep
   * the fallback font's measurements forever.
   */
  fontsVersion: number;
  bumpFontsVersion: () => void;

  setProject: (project: Project) => void;
  newProject: () => void;
  setName: (name: string) => void;
  setBackgroundColor: (color: string) => void;

  select: (id: string | null) => void;

  addImageLayer: (src: string, name: string, naturalAspect: number) => void;
  addTextLayer: (text?: string) => void;
  addShapeLayer: () => void;
  addVideoLayer: (src: string, name: string, naturalAspect: number, duration: number) => void;

  updateLayer: <T extends Layer>(id: string, patch: Partial<T>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  /** `layers` arrives bottom-first, matching Project.layers. */
  reorderLayers: (layers: Layer[]) => void;

  togglePlatform: (id: string) => void;
  setEnabledPlatforms: (ids: string[]) => void;
  setCropOffset: (aspect: AspectKey, offset: Point) => void;
};

export const useStore = create<Store>((set, get) => {
  /** Every mutation stamps updatedAt, so the save file always reflects the last edit. */
  const patchProject = (fn: (project: Project) => Partial<Project>) =>
    set((state) => ({ project: { ...state.project, ...fn(state.project), updatedAt: now() } }));

  const addLayer = (layer: Layer) => {
    patchProject((project) => ({ layers: [...project.layers, layer] }));
    set({ selectedId: layer.id });
  };

  const base = (name: string, box: ReturnType<typeof centredBox>) => ({
    id: uid(),
    name,
    ...box,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  });

  return {
    project: emptyProject(),
    selectedId: null,
    fontsVersion: 0,
    bumpFontsVersion: () => set((state) => ({ fontsVersion: state.fontsVersion + 1 })),

    setProject: (project) => set({ project, selectedId: null }),
    newProject: () => set({ project: emptyProject(), selectedId: null }),
    setName: (name) => patchProject(() => ({ name })),
    setBackgroundColor: (backgroundColor) => patchProject(() => ({ backgroundColor })),

    select: (selectedId) => set({ selectedId }),

    addImageLayer: (src, name, naturalAspect) => {
      const layer: ImageLayer = {
        ...base(name, centredBox(naturalAspect)),
        type: 'image',
        src,
        fit: 'cover',
        cornerRadius: 0,
      };
      addLayer(layer);
    },

    addTextLayer: (text = 'Your headline') => {
      const width = MASTER_SIZE.w * 0.7;
      const layer: TextLayer = {
        ...base('Text', {
          x: (MASTER_SIZE.w - width) / 2,
          y: MASTER_SIZE.h * 0.4,
          width,
          height: 200,
        }),
        type: 'text',
        text,
        fontFamily: 'Inter',
        fontSource: 'google',
        fontWeight: 700,
        fontSize: 140,
        lineHeight: 1.15,
        letterSpacing: 0,
        align: 'center',
        fill: '#FFFFFF',
      };
      addLayer(layer);
    },

    addShapeLayer: () => {
      const layer: ShapeLayer = {
        ...base('Rectangle', centredBox(1, 0.5)),
        type: 'shape',
        fill: '#F59E0B',
        cornerRadius: 0,
      };
      addLayer(layer);
    },

    addVideoLayer: (src, name, naturalAspect, duration) => {
      const layer: VideoLayer = {
        ...base(name, centredBox(naturalAspect)),
        type: 'video',
        src,
        inPoint: 0,
        outPoint: duration,
        muted: true,
        fit: 'cover',
      };
      addLayer(layer);
    },

    updateLayer: (id, patch) =>
      patchProject((project) => ({
        layers: project.layers.map((layer) =>
          layer.id === id ? ({ ...layer, ...patch } as Layer) : layer,
        ),
      })),

    removeLayer: (id) => {
      patchProject((project) => ({ layers: project.layers.filter((layer) => layer.id !== id) }));
      if (get().selectedId === id) set({ selectedId: null });
    },

    duplicateLayer: (id) => {
      const source = get().project.layers.find((layer) => layer.id === id);
      if (!source) return;
      // Offset the copy so it is visibly distinct from the original underneath it.
      const copy: Layer = { ...source, id: uid(), name: `${source.name} copy`, x: source.x + 40, y: source.y + 40 };
      patchProject((project) => {
        const index = project.layers.findIndex((layer) => layer.id === id);
        const layers = [...project.layers];
        layers.splice(index + 1, 0, copy);
        return { layers };
      });
      set({ selectedId: copy.id });
    },

    reorderLayers: (layers) => patchProject(() => ({ layers })),

    togglePlatform: (id) =>
      patchProject((project) => ({
        enabledPlatforms: project.enabledPlatforms.includes(id)
          ? project.enabledPlatforms.filter((p) => p !== id)
          : [...project.enabledPlatforms, id],
      })),

    setEnabledPlatforms: (enabledPlatforms) => patchProject(() => ({ enabledPlatforms })),

    setCropOffset: (aspect, offset) =>
      patchProject((project) => ({ cropOffsets: { ...project.cropOffsets, [aspect]: offset } })),
  };
});

/**
 * Enabled platforms in canonical preset order rather than click order.
 * Filtering PLATFORMS (rather than mapping the id list) keeps element references
 * stable, so `useShallow` can stop this from re-rendering on every store write.
 */
export function useEnabledPlatforms(): Platform[] {
  return useStore(
    useShallow((state) => PLATFORMS.filter((p) => state.project.enabledPlatforms.includes(p.id))),
  );
}
