import Konva from 'konva';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

// Konva defaults a stage's pixelRatio to window.devicePixelRatio, which would make
// every export silently 2x on a HiDPI screen. Pin it to 1 here — BEFORE any stage
// exists — and pass an explicit pixelRatio at export time instead.
Konva.pixelRatio = 1;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
