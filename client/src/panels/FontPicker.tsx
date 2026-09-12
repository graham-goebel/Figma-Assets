import { useEffect, useMemo, useState } from 'react';
import { type FontAsset, type GoogleFont, fetchAssets, fetchGoogleFonts } from '../api.ts';
import { loadGoogleFont } from '../fonts/fontRegistry.ts';
import { useStore } from '../state/store.ts';
import type { TextLayer } from '../state/types.ts';

type Props = {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
};

export default function FontPicker({ layer, onChange }: Props) {
  const bumpFontsVersion = useStore((s) => s.bumpFontsVersion);
  const [local, setLocal] = useState<FontAsset[]>([]);
  const [google, setGoogle] = useState<GoogleFont[]>([]);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAssets().then((a) => setLocal(a.fonts)).catch(() => undefined);
    fetchGoogleFonts()
      .then((res) => {
        setGoogle(res.fonts);
        if (res.error) setGoogleError(res.error);
      })
      .catch((err: Error) => setGoogleError(err.message));
  }, []);

  const localFamilies = useMemo(
    () => [...new Set(local.map((f) => f.family))].sort((a, b) => a.localeCompare(b)),
    [local],
  );

  const googleMatches = useMemo(() => {
    if (!query.trim()) return google.slice(0, 40);
    const q = query.toLowerCase();
    return google.filter((f) => f.family.toLowerCase().includes(q)).slice(0, 40);
  }, [google, query]);

  const weightsFor = (family: string, source: 'local' | 'google'): number[] => {
    if (source === 'local') {
      const weights = local.filter((f) => f.family === family).map((f) => f.weight);
      return weights.length ? [...new Set(weights)].sort((a, b) => a - b) : [400];
    }
    return google.find((f) => f.family === family)?.weights ?? [400, 700];
  };

  const pick = async (family: string, source: 'local' | 'google') => {
    const weights = weightsFor(family, source);
    // Keep the current weight if the new family has it, else fall back sensibly.
    const weight = weights.includes(layer.fontWeight) ? layer.fontWeight : (weights.find((w) => w >= 400) ?? weights[0]);

    if (source === 'google') await loadGoogleFont(family, weights);
    onChange({ fontFamily: family, fontSource: source, fontWeight: weight });
    bumpFontsVersion();
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

      {localFamilies.length > 0 && (
        <>
          <p className="field-label">From assets/fonts</p>
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
        </>
      )}

      <p className="field-label">Google Fonts</p>
      {googleError && <p className="error small">Google Fonts unavailable: {googleError}</p>}
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
