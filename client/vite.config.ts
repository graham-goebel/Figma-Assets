import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// No backend: this app runs entirely on claude.ai Artifact capabilities
// (assets/db/downloads). `npm run dev` is useful for iterating on layout and
// typechecking, but uploads/save/export only activate once it's published and
// opened from its claude.ai link — see src/claude.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Relative base: the Artifact publisher serves files by relative path with no
  // leading slash, so the built HTML must reference "assets/x.js", not "/assets/x.js".
  base: './',
  build: {
    assetsDir: 'assets',
    chunkSizeWarningLimit: 900,
  },
});
