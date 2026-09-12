import { useEffect, useState } from 'react';
import { type AssetFile, type FontAsset, fetchAssets } from '../api.ts';
import { registerLocalFonts } from '../fonts/fontRegistry.ts';
import { useStore } from '../state/store.ts';

export default function AssetBrowser() {
  const addImageLayer = useStore((s) => s.addImageLayer);
  const bumpFontsVersion = useStore((s) => s.bumpFontsVersion);

  const [images, setImages] = useState<AssetFile[]>([]);
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets()
      .then(async (assets) => {
        setImages(assets.images);
        setFonts(assets.fonts);
        await registerLocalFonts(assets.fonts);
        // Fonts are now measurable — force text nodes to re-measure.
        bumpFontsVersion();
      })
      .catch((err: Error) => setError(err.message));
  }, [bumpFontsVersion]);

  const add = (image: AssetFile) => {
    // Size the new layer to the image's own aspect ratio.
    const probe = new Image();
    probe.src = image.url;
    probe
      .decode()
      .then(() =>
        addImageLayer(image.url, image.name, probe.naturalWidth / probe.naturalHeight || 1),
      )
      .catch(() => addImageLayer(image.url, image.name, 1));
  };

  const visible = images.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Images</h2>
        <span className="muted">{images.length}</span>
      </header>

      {error && <p className="error">{error}</p>}

      <input
        className="search"
        placeholder="Filter images…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {images.length === 0 && !error ? (
        <p className="empty">
          Drop images into <code>assets/images/</code> and refresh.
        </p>
      ) : (
        <div className="asset-grid">
          {visible.map((image) => (
            <button key={image.name} type="button" className="asset" onClick={() => add(image)} title={image.name}>
              <img src={image.url} alt={image.name} loading="lazy" />
              <span>{image.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="muted small">
        {fonts.length} local font{fonts.length === 1 ? '' : 's'} loaded from <code>assets/fonts/</code>
      </p>
    </section>
  );
}
