import { useEffect, useRef, useState } from 'react';
import { type ImageAsset, listImages, uploadImage } from '../backend.ts';
import { useStore } from '../state/store.ts';

export default function AssetBrowser() {
  const addImageLayer = useStore((s) => s.addImageLayer);

  const [images, setImages] = useState<ImageAsset[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => listImages().then(setImages).catch((err: Error) => setError(err.message));

  useEffect(() => {
    refresh();
  }, []);

  const upload = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const asset = await uploadImage(file);
        setImages((prev) => [asset, ...prev]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const add = (image: ImageAsset) => {
    addImageLayer(image.url, image.name, image.width / image.height || 1);
  };

  const visible = images.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Images</h2>
        <span className="muted">{images.length}</span>
      </header>

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        className={`dropzone${dragOver ? ' is-over' : ''}`}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
      >
        {uploading ? 'Uploading…' : 'Drop images here, or click to choose'}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = '';
        }}
      />

      {images.length > 0 && (
        <input
          className="search"
          placeholder="Filter images…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      {images.length === 0 && !uploading ? (
        <p className="empty">Upload an image to add your first layer.</p>
      ) : (
        <div className="asset-grid">
          {visible.map((image) => (
            <button
              key={image.assetId}
              type="button"
              className="asset"
              onClick={() => add(image)}
              title={image.name}
            >
              <img src={image.url} alt={image.name} loading="lazy" />
              <span>{image.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
