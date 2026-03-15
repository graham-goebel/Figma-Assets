Extract assets from a Figma file using MCP, following strict rules for SVGs, raster images, and fallback placeholders.

## Arguments
- `$ARGUMENTS` — Optional: a Figma node URL, node ID, or layer name to scope extraction. If omitted, extract all exportable assets from the current file.

## Workflow

### 1. Identify nodes to extract

Use the Figma MCP to list exportable nodes from the file (or the node specified in `$ARGUMENTS`). For each node, record:
- `id` — node ID
- `name` — layer name (used for filenames and placeholders)
- `type` — node type (e.g. VECTOR, FRAME, COMPONENT, RECTANGLE, etc.)
- `absoluteBoundingBox` — `{ width, height }` in the Figma canvas coordinate system (no scaling)

### 2. Determine asset type

For each node:
- **SVG**: node type is VECTOR, or the node has a fill that is a vector/path, or the layer name contains "icon", "logo", or "svg". Also treat COMPONENT and FRAME nodes that contain only vector children as SVG candidates.
- **Raster image**: node has an image fill (type `IMAGE`), or is a raster asset (PNG/JPG source).
- When ambiguous, prefer SVG.

---

### 3. SVG export rules (CRITICAL)

> **SVGs must be exported at their native canvas size — no scaling, no resizing.**

For every SVG node:

1. Call the Figma MCP export with format `SVG` and scale `1` (1x, no upscaling or downscaling).
2. Read the `absoluteBoundingBox` from the node metadata: `width` × `height` (in pixels at 1x).
3. When writing the SVG file, verify or set the root `<svg>` element's `width` and `height` attributes to match the bounding box exactly:
   ```xml
   <svg width="<width>" height="<height>" viewBox="0 0 <width> <height>" ...>
   ```
4. Do **not** strip `width`/`height` from the SVG root. Do **not** use `100%` or relative units.
5. When placing the SVG in code (e.g. an `<img>` tag, CSS `background-image`, or a component), set the rendered dimensions to match the exported SVG's intrinsic size:
   ```html
   <!-- correct -->
   <img src="./assets/<name>.svg" width="<width>" height="<height>" alt="<name>" />
   ```
   Do **not** omit `width`/`height` or apply CSS that would stretch or shrink the element.
6. Save the file to `./assets/<name>.svg` (sanitize the layer name to a valid filename: lowercase, spaces → hyphens, strip special characters).

---

### 4. Raster image download rules (CRITICAL)

> **Images must always be saved as local files. Never use expiring MCP-generated URLs in output code.**

For every raster image node:

1. Call the Figma MCP to get the image export URL for the node (format `PNG` at scale `2` for retina, or `1` if the image is already large).
2. **Immediately download** the image bytes from that URL using a tool (e.g. `curl`, `fetch`, or equivalent) and save them to `./assets/<name>.png` (or `.jpg` if the source is JPEG).
3. Confirm the file was saved successfully (non-zero byte count).
4. Use only the local path `./assets/<name>.png` in all output code — never the MCP URL.
5. Example correct usage:
   ```html
   <img src="./assets/<name>.png" alt="<name>" />
   ```
   ```css
   background-image: url('./assets/<name>.png');
   ```

---

### 5. Placeholder rule (CRITICAL)

> **If a node's asset cannot be extracted for any reason, insert a placeholder — never silently skip it.**

A node fails if:
- The MCP export call returns an error or empty response
- The image download returns a non-2xx status or zero bytes
- The SVG content is empty or malformed

For every failed node, create a placeholder element using the **layer name** as the label:

```html
<!-- Placeholder: asset "<name>" could not be extracted -->
<div
  class="asset-placeholder"
  style="
    width: <width>px;
    height: <height>px;
    background: #E8E8E8;
    border: 2px dashed #AAAAAA;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    font-size: 12px;
    color: #666666;
    text-align: center;
    box-sizing: border-box;
    padding: 8px;
  "
  data-layer="<name>"
>
  <span>⚠ <name></span>
</div>
```

Use the node's `absoluteBoundingBox` width and height for the placeholder dimensions. If dimensions are unavailable, default to `100px × 100px`.

---

### 6. Output summary

After extracting all assets, print a summary table:

```
Asset Extraction Summary
========================
✓ SVG        icon-home          → ./assets/icon-home.svg       (24×24)
✓ PNG        hero-banner        → ./assets/hero-banner.png     (1440×800)
⚠ PLACEHOLDER card-thumbnail   → placeholder (320×240) — MCP export failed
```

List every node: successes with `✓`, placeholders with `⚠`.

---

## Rules recap (always follow these)

| Rule | Requirement |
|------|-------------|
| SVG size | Export at scale 1x; set explicit `width`/`height` on `<svg>` and on placement element |
| Image storage | Download to `./assets/` immediately; never use MCP/CDN URLs in output |
| Placeholder | Always create one when extraction fails; use layer name and bounding box size |
| Filename | Sanitized layer name (lowercase, hyphens, no special chars) |
| Asset dir | All files go into `./assets/` relative to the project root |
