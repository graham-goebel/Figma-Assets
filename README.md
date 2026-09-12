# Social Post Composer

Design a post once, export it correctly sized for every social platform at once.

You build a single composition on a master canvas — images and fonts you upload,
background and text colour — and live **crop marks** show exactly what each
platform will clip. One export writes a correctly-sized file per platform, named
from the single name you type: `summer-sale_instagram.png`, `summer-sale_tiktok.png`,
and so on.

## Try it now

**[Open the published app](https://claude.ai/code/artifact/7a0dc8f5-a2ff-493a-90b6-e7d16f346aa2)**
— nothing to install. It's a Claude Artifact: fully static, no server, and your
uploads/projects are stored with the artifact itself (via claude.ai's `assets` and
`db` capabilities), so they're there next time you open the same link. Because it
declares those capabilities, the artifact is **organization-internal** — anyone
signed into your claude.ai org can open it, but it can't be shared publicly.

Uploads and export only work when opened from that link (they need the claude.ai
capabilities). Running `npm run dev` locally is still useful for editing the UI
itself — the canvas, layers, and layout all work without them — but there's no
`window.claude` outside a real Artifact view, so image/font upload, save, and
export show a plain "isn't available here" message instead.

## How it works

**Master canvas — 2160 × 2160.** Every platform crop is a *downscale* of the
master, never an upscale. 2160 is exactly 2× the 1080 base most presets use,
which keeps the downscales clean.

**Crop-only model.** There is one design. Each platform is a crop window over it,
and the crop offset is shared per aspect ratio — nudging the 9:16 framing moves
Instagram Story, Facebook Story, TikTok and YouTube Shorts together, which is what
makes "design once" true.

**Safe zone.** The shaded region is everything *outside* the intersection of all
enabled crops. Keep the important content inside the clear area and it survives
every platform you've selected.

**Deduplication.** The 12 presets collapse to 7 distinct renders (the four 9:16
presets are identical pixels, as are the three 1080×1080s). Each distinct image is
rendered once, then handed to you under every platform name you asked for.

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

Uploaded fonts are read with `fontkit` (bundled for the browser), so the family
name comes from the font's own name table rather than its filename
(`BigShoulders-Bold.ttf` correctly registers as *Big Shoulders*, weight 700).
Google Fonts are picked from a bundled catalogue of 67 families and loaded live
from `fonts.googleapis.com` — the Artifact sandbox allows stylesheet/font
resources from Google Fonts but blocks arbitrary network fetches, which is also
why the catalogue is bundled rather than fetched from Google's metadata API.

**Exports are font-gated.** Before rasterising, every text face in use must
actually resolve. If one doesn't, the export is *cancelled with a named error*
rather than silently shipping your headline in a fallback font.

## Architecture

This app is **fully client-side** — there is no backend. It runs entirely on
three claude.ai Artifact runtime capabilities:

- **`assets`** — stores uploaded images and fonts (binary, up to 20 MiB each)
- **`db`** — stores the image/font library index and saved projects (JSON)
- **`downloads`** — hands exported files to you as a normal browser save

```
client/    Vite + React + TypeScript, Konva canvas
  src/claude.ts      typed access to the three capabilities above
  src/backend.ts     upload/list/save/export, all capability-backed
  src/canvas/        Konva stage, layers, crop marks
  src/export/        crop math, rasterisation, save/zip
  src/panels/        asset browser, layers, properties, fonts, export bar
```

There used to be an `server/` Express backend reading from a local `assets/`
folder (the very first version of this tool, before "make it web based"). It's
kept in the repo in case a self-hosted, non-Artifact deployment is ever wanted
again, but the client no longer talks to it.

## Status

**Phase 1 (done)** — canvas, layers (reorder / duplicate / delete / lock / hide),
image + text + shape layers, uploaded and Google fonts, crop marks, safe zone,
platform dropdown, PNG/JPEG export (individually or as one zip), project save/load.

**Phase 2 (next)** — video layer with a minimal looping player, frame-exact
seamless trim, and per-platform video export. In the browser, this would run on
`ffmpeg.wasm` rather than a server-side ffmpeg process — slower, but keeps
everything client-side and consistent with the rest of this app.
