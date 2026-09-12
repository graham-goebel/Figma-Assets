# Social Post Composer

Design a post once, export it correctly sized for every social platform at once.

You build a single composition on a master canvas — images from your own asset
folder, text in your own fonts, background and text colours — and live **crop
marks** show exactly what each platform will clip. One export then writes a
correctly-sized file per platform, named from the single name you type:
`summer-sale_instagram.png`, `summer-sale_tiktok.png`, and so on.

## Quick start

```bash
npm install
npm run dev          # server on :5174, app on http://localhost:5173
```

Then drop your files into:

```
assets/images/     jpg, png, webp, gif, avif, svg
assets/fonts/      ttf, otf, woff, woff2
assets/videos/     mp4, mov, webm   (Phase 2)
```

Saved projects land in `projects/`, exports in `exports/<name>/`.

## How it works

**Master canvas — 2160 × 2160.** Every platform crop is a *downscale* of the
master, never an upscale, so nothing is ever softened by being blown up. 2160 is
exactly 2× the 1080 base most presets use, which keeps the downscales clean.

**Crop-only model.** There is one design. Each platform is a crop window over it,
and the crop offset is shared per aspect ratio — so nudging the 9:16 framing moves
Instagram Story, Facebook Story, TikTok and YouTube Shorts together, which is what
makes "design once" true.

**Safe zone.** The shaded region is everything *outside* the intersection of all
enabled crops. Keep the important content inside the clear area and it survives
every platform you've selected.

**Deduplication.** The 12 presets collapse to 7 distinct renders (the four 9:16
presets are identical pixels, as are the three 1080×1080s). Each distinct image is
rendered once, then written under every platform name you asked for.

## Platforms

| Preset | Output | Suffix |
|---|---|---|
| Instagram Feed | 1080×1080 | `_instagram` |
| Instagram Portrait | 1080×1350 | `_instagram_portrait` |
| Instagram Story / Reels | 1080×1920 | `_instagram_story` |
| Facebook Feed | 1080×1080 | `_facebook` |
| Facebook Link | 1200×630 | `_facebook_link` |
| Facebook Story | 1080×1920 | `_facebook_story` |
| X / Twitter | 1600×900 | `_x` |
| LinkedIn Link | 1200×627 | `_linkedin` |
| LinkedIn Square | 1080×1080 | `_linkedin_square` |
| TikTok | 1080×1920 | `_tiktok` |
| YouTube Shorts | 1080×1920 | `_youtube_shorts` |
| Pinterest | 1000×1500 | `_pinterest` |

## Fonts

Local fonts are read with `fontkit`, so the family name comes from the font's own
name table rather than its filename (`BigShoulders-Bold.ttf` correctly registers as
*Big Shoulders*, weight 700). Google Fonts are searchable in the picker; if the
catalogue endpoint is unreachable the app falls back to a bundled list of 67
popular families.

**Exports are font-gated.** Before rasterising, every text face in use must
actually resolve. If one doesn't, the export is *cancelled with a named error*
rather than silently shipping your headline in Times — a silent fallback in a
delivered asset is worse than a failed export.

## Project layout

```
client/    Vite + React + TypeScript, Konva canvas
server/    Express: asset scanning, fonts, projects, export writing
assets/    your source files
projects/  saved .json projects
exports/   generated output
```

## Status

**Phase 1 (done)** — canvas, layers (reorder / duplicate / delete / lock / hide),
image + text + shape layers, local and Google fonts, crop marks, safe zone,
platform dropdown, PNG/JPEG export to disk and as a zip, project save/load.

**Phase 2 (next)** — video layer with a minimal looping player, frame-exact
seamless trim, and per-platform video export via ffmpeg.
