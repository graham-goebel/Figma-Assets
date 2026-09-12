export type GoogleFont = { family: string; category: string; weights: number[]; italics: boolean };

const W = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const STD = [300, 400, 500, 600, 700];

/**
 * No network fetch is possible from inside the Artifact sandbox (only script/
 * stylesheet/font tags to the allowed CDN hosts, never fetch/XHR), so this
 * catalogue is bundled statically rather than coming from Google's metadata
 * endpoint. The css2 stylesheet a chosen family actually loads from IS
 * reachable — it's a stylesheet resource, not a fetch — so picking a family
 * here still renders the real font, just from a fixed list rather than a
 * live search across all of Google Fonts.
 */
export const GOOGLE_FONTS_CATALOG: GoogleFont[] = (
  [
    ['Inter', 'sans-serif', W],
    ['Roboto', 'sans-serif', W],
    ['Open Sans', 'sans-serif', [300, 400, 500, 600, 700, 800]],
    ['Montserrat', 'sans-serif', W],
    ['Poppins', 'sans-serif', W],
    ['Lato', 'sans-serif', [100, 300, 400, 700, 900]],
    ['Oswald', 'sans-serif', [200, 300, 400, 500, 600, 700]],
    ['Raleway', 'sans-serif', W],
    ['Nunito', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900]],
    ['Nunito Sans', 'sans-serif', [200, 300, 400, 600, 700, 800, 900]],
    ['Work Sans', 'sans-serif', W],
    ['Rubik', 'sans-serif', [300, 400, 500, 600, 700, 800, 900]],
    ['Manrope', 'sans-serif', [200, 300, 400, 500, 600, 700, 800]],
    ['DM Sans', 'sans-serif', [400, 500, 700]],
    ['Outfit', 'sans-serif', W],
    ['Plus Jakarta Sans', 'sans-serif', [200, 300, 400, 500, 600, 700, 800]],
    ['Figtree', 'sans-serif', [300, 400, 500, 600, 700, 800, 900]],
    ['Sora', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800]],
    ['Space Grotesk', 'sans-serif', [300, 400, 500, 600, 700]],
    ['Archivo', 'sans-serif', W],
    ['Barlow', 'sans-serif', W],
    ['Karla', 'sans-serif', [200, 300, 400, 500, 600, 700, 800]],
    ['Mulish', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900]],
    ['Quicksand', 'sans-serif', [300, 400, 500, 600, 700]],
    ['Josefin Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700]],
    ['Bebas Neue', 'display', [400]],
    ['Anton', 'display', [400]],
    ['Archivo Black', 'display', [400]],
    ['Alfa Slab One', 'display', [400]],
    ['Righteous', 'display', [400]],
    ['Fredoka', 'display', [300, 400, 500, 600, 700]],
    ['Bungee', 'display', [400]],
    ['Titan One', 'display', [400]],
    ['Passion One', 'display', [400, 700, 900]],
    ['Playfair Display', 'serif', [400, 500, 600, 700, 800, 900]],
    ['Merriweather', 'serif', [300, 400, 700, 900]],
    ['Lora', 'serif', [400, 500, 600, 700]],
    ['Libre Baskerville', 'serif', [400, 700]],
    ['Source Serif 4', 'serif', [200, 300, 400, 500, 600, 700, 800, 900]],
    ['Cormorant Garamond', 'serif', [300, 400, 500, 600, 700]],
    ['EB Garamond', 'serif', [400, 500, 600, 700, 800]],
    ['Crimson Text', 'serif', [400, 600, 700]],
    ['Bitter', 'serif', W],
    ['Zilla Slab', 'serif', [300, 400, 500, 600, 700]],
    ['Abril Fatface', 'display', [400]],
    ['DM Serif Display', 'serif', [400]],
    ['Instrument Serif', 'serif', [400]],
    ['Fraunces', 'serif', W],
    ['Roboto Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700]],
    ['JetBrains Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700, 800]],
    ['IBM Plex Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700]],
    ['Space Mono', 'monospace', [400, 700]],
    ['Fira Code', 'monospace', [300, 400, 500, 600, 700]],
    ['Pacifico', 'handwriting', [400]],
    ['Dancing Script', 'handwriting', [400, 500, 600, 700]],
    ['Caveat', 'handwriting', [400, 500, 600, 700]],
    ['Satisfy', 'handwriting', [400]],
    ['Great Vibes', 'handwriting', [400]],
    ['Permanent Marker', 'handwriting', [400]],
    ['Shadows Into Light', 'handwriting', [400]],
    ['Kalam', 'handwriting', [300, 400, 700]],
    ['IBM Plex Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700]],
    ['Cabin', 'sans-serif', [400, 500, 600, 700]],
    ['Exo 2', 'sans-serif', W],
    ['Teko', 'sans-serif', [300, 400, 500, 600, 700]],
    ['Chivo', 'sans-serif', W],
    ['Asap', 'sans-serif', STD],
  ] as const
).map(([family, category, weights]) => ({
  family,
  category,
  weights: [...weights],
  italics: true,
}));
