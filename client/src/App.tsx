import CanvasScene from './canvas/CanvasScene.tsx';
import AssetBrowser from './panels/AssetBrowser.tsx';
import ExportBar from './panels/ExportBar.tsx';
import LayerPanel from './panels/LayerPanel.tsx';
import PropertiesPanel from './panels/PropertiesPanel.tsx';

export default function App() {
  return (
    <div className="app">
      <ExportBar />
      <main className="workspace">
        <aside className="sidebar left">
          <AssetBrowser />
          <LayerPanel />
        </aside>
        <CanvasScene />
        <aside className="sidebar right">
          <PropertiesPanel />
        </aside>
      </main>
    </div>
  );
}
