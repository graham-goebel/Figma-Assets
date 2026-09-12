import { useEffect, useMemo, useRef, useState } from 'react';
import { type FontAsset, listFonts, uploadFont } from '../backend.ts';
import { GOOGLE_FONTS_CATALOG } from '../fonts/googleFontsCatalog.ts';
import { loadGoogleFont, registerLocalFonts } from '../fonts/fontRegistry.ts';
import { useStore } from '../state/store.ts';
import type { TextLayer } from '../state/types.ts';

type Props = {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
};

export default function FontPicker({ layer, onChange }: Props) {
  const bumpFontsVersion = useStore((s) => s.bumpFontsVersion);
  const [local, setLocal] = useState<FontAsset[]>([]);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () =>
    listFonts()
      .then(async (fonts) => {
        setLocal(fonts);
        await registerLocalFonts(fonts);
        bumpFontsVersion();
      })
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    refresh();
    // Only on mount — refresh() is re-created every render but should run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localFamilies = useMemo(
    () => [...new Set(local.map((f) => f.family))].sort((a, b) => a.localeCompare(b)),
    [local],
  );

  const googleMatches = useMemo(() => {
    if (!query.trim()) return GOOGLE_FONTS_CATALOG.slice(0, 40);
    const q = query.toLowerCase();
    return GOOGLE_FONTS_CATALOG.filter((f) => f.family.toLowerCase().includes(q)).slice(0, 40);
  }, [query]);

  const weightsFor = (family: string, source: 'local' | 'google'): number[] => {
    if (source === 'local') {
      const weights = local.filter((f) => f.family === family).map((f) => f.weight);
      return weights.length ? [...new Set(weights)].sort((a, b) => a - b) : [400];
    }
    return GOOGLE_FONTS_CATALOG.find((f) => f.family === family)?.weights ?? [400, 700];
  };

  const pick = async (family: string, source: 'local' | 'google') => {
    const weights = weightsFor(family, source);
    const weight = weights.includes(layer.fontWeight) ? layer.fontWeight : (weights.find((w) => w >= 400) ?? weights[0]);

    if (source === 'google') await loadGoogleFont(family, weights);
    onChange({ fontFamily: family, fontSource: source, fontWeight: weight });
    bumpFontsVersion();
  };

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const font = await uploadFont(file);
      await registerLocalFonts([font]);
      setLocal((prev) => [...prev, font]);
      bumpFontsVersion();
      await pick(font.family, 'local');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const weights = weightsFor(layer.fontFamily, layer.fontSource);

  return (
    <div className="font-picker">
      <label>
        <span>Font</span>
        <div className="font-current">
          {layer.fontFamily}
          <em>{layer.fontSource}</em>
        </div>
      </label>

      <label>
        <span>Weight</span>
        <select
          value={layer.fontWeight}
          onChange={async (e) => {
            const weight = Number(e.target.value);
            if (layer.fontSource === 'google') await loadGoogleFont(layer.fontFamily, [weight]);
            onChange({ fontWeight: weight });
            bumpFontsVersion();
          }}
        >
          {weights.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error small">{error}</p>}

      <p className="field-label">Your uploads</p>
      <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}>
        {uploading ? 'Uploading…' : '+ Upload a font (.ttf/.otf/.woff2)'}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        hidden
        onChange={(e) => {
          void handleUpload(e.target.files);
          e.target.value = '';
        }}
      />
      {localFamilies.length > 0 && (
        <div className="font-list">
          {localFamilies.map((family) => (
            <button
              key={family}
              type="button"
              className={family === layer.fontFamily ? 'is-active' : ''}
              style={{ fontFamily: `"${family}", sans-serif` }}
              onClick={() => pick(family, 'local')}
            >
              {family}
            </button>
          ))}
        </div>
      )}

      <p className="field-label">Google Fonts</p>
      <input
        className="search"
        placeholder="Search Google Fonts…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="font-list">
        {googleMatches.map((font) => (
          <button
            key={font.family}
            type="button"
            className={font.family === layer.fontFamily ? 'is-active' : ''}
            onClick={() => pick(font.family, 'google')}
          >
            {font.family}
            <em>{font.category}</em>
          </button>
        ))}
      </div>
    </div>
  );
}
