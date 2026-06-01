# `screenshot_canvas` — on-demand graphics surface capture

This is the helper an LLM running an E2E test plan invokes when a step is annotated `[canvas-check: <surfaceId>]`. It belongs alongside the a11y-snap helper, in the project's `scripts/` directory or pasted inline into `evaluate_script`.

## Contract

Inputs:
- `surfaceId` — the value the a11y-snap helper emitted for this surface
- `scale = 0.5` — half-res default
- `cropAround = { x, y, radius }?` — original-surface-space focal point; if omitted, the full visible viewport of the surface is captured
- `settleMs = 500` — hard ceiling on the animation-quiescence wait

Output:
```json
{ "dataUrl": "data:image/webp;base64,...", "w": 720, "h": 450, "scale": 0.5, "sourceW": 1440, "sourceH": 900 }
```

The returned image is what the model "sees". Decode and inspect for the step's expected outcome.

## Implementation (`evaluate_script` payload)

```js
async ({surfaceId, scale = 0.5, cropAround, settleMs = 500}) => {
  const el = document.querySelector(
    `[aria-label="${surfaceId}"], [data-testid="${surfaceId}"], #${CSS.escape(surfaceId)}`
  );
  // Quiescence wait — same hash function as a11y-snap. Bail when stable for 2 consecutive frames, or hit cap.
  const hashNow = () => {
    if (el.tagName === 'CANVAS') {
      const off = document.createElement('canvas'); off.width = 16; off.height = 16;
      const ctx = off.getContext('2d'); ctx.drawImage(el, 0, 0, 16, 16);
      const d = ctx.getImageData(0,0,16,16).data;
      let h = 0; for (let i=0;i<d.length;i+=4){const g=(d[i]+d[i+1]+d[i+2])/3|0; h=(((h<<5)-h)+g)|0;}
      return (h>>>0).toString(36);
    }
    const s = el.outerHTML; let h = 0;
    for (let i=0;i<s.length;i++) h=(((h<<5)-h)+s.charCodeAt(i))|0;
    return (h>>>0).toString(36);
  };
  const t0 = performance.now();
  let prev = hashNow(); let stable = 0;
  while (performance.now() - t0 < settleMs) {
    await new Promise(r => requestAnimationFrame(r));
    const next = hashNow();
    if (next === prev) { if (++stable >= 2) break; } else { stable = 0; prev = next; }
  }
  const r = el.getBoundingClientRect();
  // cropAround in ORIGINAL surface coords. Without it: full visible viewport.
  const sx = cropAround ? Math.max(0, cropAround.x - cropAround.radius) : 0;
  const sy = cropAround ? Math.max(0, cropAround.y - cropAround.radius) : 0;
  const sw = cropAround ? cropAround.radius * 2 : el.tagName === 'CANVAS' ? el.width : r.width;
  const sh = cropAround ? cropAround.radius * 2 : el.tagName === 'CANVAS' ? el.height : r.height;
  const out = document.createElement('canvas');
  out.width = Math.round(sw * scale); out.height = Math.round(sh * scale);
  const ctx = out.getContext('2d');
  if (el.tagName === 'CANVAS') {
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, out.width, out.height);
  } else {
    // SVG: rasterize via <img src=data:image/svg+xml;...>
    const blob = new Blob([el.outerHTML], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height); URL.revokeObjectURL(url); res(); };
      img.onerror = rej; img.src = url;
    });
  }
  return await new Promise(res => out.toBlob(b => {
    const fr = new FileReader(); fr.onload = () => res({dataUrl: fr.result, w: out.width, h: out.height, scale, sourceW: sw, sourceH: sh}); fr.readAsDataURL(b);
  }, 'image/webp', 0.7));
}
```

## Coord rule for subsequent click/drag

The model reports coordinates **in original surface space** (the helper returned `sourceW`/`sourceH`/`scale` so the math is on the model's side). The click dispatcher does NOT auto-scale. Fewer footguns; the model already knows surface dimensions.
