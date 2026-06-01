#!/usr/bin/env node
/**
 * a11y-snap — diff + merge helper for accessibility-tree snapshots.
 *
 * Two parts:
 *   1. `getBrowserHelper()` — returns the JS source you inline into an
 *      `evaluate_script` (chrome-devtools MCP) or `page.evaluate` (Playwright)
 *      call. The helper walks the DOM from <body>, emits a compact array of
 *      interactive / announcing nodes with a stable hash id per node, and
 *      tags anomalies inline.
 *   2. CLI:  `node a11y-snap.mjs diff <snapshotFile> < <currentJson>`  —
 *      diffs the JSON on stdin against the previous snapshot stored in
 *      <snapshotFile> (markdown), writes the new state back, and prints the
 *      ANOMALY SUMMARY to stdout for the supervising LLM.
 *      `node a11y-snap.mjs full <snapshotFile> < <currentJson>` — overwrites
 *      the snapshot file unconditionally and prints a short summary. Use
 *      after a navigation or any time the previous snapshot is known stale.
 *      `node a11y-snap.mjs print-helper`              — prints the browser
 *      helper JS to stdout so you can pipe it into your evaluate_script.
 *
 * Snapshot file layout (markdown):
 *
 *   # a11y snapshot — <timestamp>, <url>
 *
 *   ## Anomaly summary
 *   - 0 anomalies
 *
 *   ## Diff vs previous (most recent only)
 *   _none — full refresh_
 *
 *   ## Full tree (N nodes)
 *   ```json
 *   [ {"id":"…","role":"…", … }, … ]
 *   ```
 *
 * Stable ids: hash of (role + accessibleName + parent-role chain + sibling
 * index). Survives label changes inside the same node, breaks when the node
 * moves to a different parent or its role changes — exactly the granularity
 * we want for diff-stability.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// ── 1. Browser helper (runs inside the page) ────────────────────────────
const BROWSER_HELPER = `
(() => {
  // Roles + tags we consider "interactive" or "announcing" — everything
  // else (decorative spans, layout divs) is skipped to keep the tree small.
  const INTERESTING_ROLES = new Set([
    'button','link','textbox','combobox','listbox','option','checkbox','radio',
    'switch','slider','spinbutton','tab','tabpanel','menu','menuitem',
    'menuitemcheckbox','menuitemradio','dialog','alertdialog','alert','status',
    'progressbar','tooltip','treeitem','grid','gridcell','row','columnheader',
    'rowheader','navigation','main','banner','contentinfo','complementary',
    'search','form','heading','img','article','region',
  ]);
  const INTERESTING_TAGS = new Set([
    'A','BUTTON','INPUT','SELECT','TEXTAREA','SUMMARY','LABEL','FIELDSET',
    'FORM','DIALOG','TABLE','THEAD','TBODY','TR','TH','TD','UL','OL','LI',
    'NAV','MAIN','HEADER','FOOTER','ASIDE','SECTION','ARTICLE',
    'H1','H2','H3','H4','H5','H6',
  ]);
  // Shell chrome we don't want to spam the snapshot with — strict CSS
  // selectors. Add more here when noisy nodes appear.
  const SHELL_SKIP = [
    '#__next-build-watcher',
    'nextjs-portal',
    '[data-nextjs-toast]',
    '[data-nextjs-dialog-overlay]',
  ];
  // ARIA attributes that signal "user attention needed" — captured as
  // anomalies even when the node would otherwise be uninteresting.
  const ANOMALY_ATTRS = ['role','aria-live','aria-invalid','data-error'];

  const isShellSkipped = (el) => SHELL_SKIP.some(sel => el.closest && el.closest(sel));

  // Best-effort accessible name. Mirrors WAI-ARIA name calc heuristics in
  // a tiny way — aria-label > aria-labelledby > input value > text content.
  const accName = (el) => {
    const al = el.getAttribute && el.getAttribute('aria-label');
    if (al) return al.trim().slice(0, 200);
    const ablId = el.getAttribute && el.getAttribute('aria-labelledby');
    if (ablId) {
      const lbl = document.getElementById(ablId);
      if (lbl) return (lbl.textContent || '').trim().slice(0, 200);
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      const val = el.value || el.placeholder || '';
      return String(val).trim().slice(0, 200);
    }
    return (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 200);
  };

  // State capture — minimal but enough to spot enable/disable, checked,
  // expanded, selected changes between snapshots.
  const stateOf = (el) => {
    const s = {};
    if (el.disabled) s.disabled = true;
    if (el.getAttribute && el.getAttribute('aria-disabled') === 'true') s.disabled = true;
    if (el.getAttribute && el.getAttribute('aria-expanded') != null) s.expanded = el.getAttribute('aria-expanded') === 'true';
    if (el.getAttribute && el.getAttribute('aria-checked') != null) s.checked = el.getAttribute('aria-checked');
    if (el.getAttribute && el.getAttribute('aria-selected') != null) s.selected = el.getAttribute('aria-selected') === 'true';
    if (el.checked != null && (el.type === 'checkbox' || el.type === 'radio')) s.checked = !!el.checked;
    if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') s.invalid = true;
    if (el.getAttribute && el.getAttribute('aria-busy') === 'true') s.busy = true;
    return Object.keys(s).length ? s : undefined;
  };

  const explicitRole = (el) => (el.getAttribute && el.getAttribute('role')) || '';
  const roleOf = (el) => {
    const r = explicitRole(el);
    if (r) return r;
    switch (el.tagName) {
      case 'A': return el.href ? 'link' : '';
      case 'BUTTON': return 'button';
      case 'INPUT': {
        const t = (el.type || 'text').toLowerCase();
        if (t === 'checkbox') return 'checkbox';
        if (t === 'radio') return 'radio';
        if (t === 'range') return 'slider';
        if (t === 'submit' || t === 'button' || t === 'reset') return 'button';
        return 'textbox';
      }
      case 'SELECT': return 'combobox';
      case 'TEXTAREA': return 'textbox';
      case 'NAV': return 'navigation';
      case 'MAIN': return 'main';
      case 'HEADER': return 'banner';
      case 'FOOTER': return 'contentinfo';
      case 'ASIDE': return 'complementary';
      case 'DIALOG': return 'dialog';
      case 'IMG': return 'img';
      case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': return 'heading';
      case 'UL': case 'OL': return 'list';
      case 'LI': return 'listitem';
      case 'TABLE': return 'table';
      case 'TR': return 'row';
      case 'TH': return 'columnheader';
      case 'TD': return 'cell';
      default: return '';
    }
  };

  const anomalyOf = (el, role) => {
    const a = [];
    // Live regions are an affordance — only an anomaly when they actually carry content.
    const hasContent = (el.textContent || '').trim().length > 0;
    if ((role === 'alert' || role === 'alertdialog' || role === 'status') && hasContent) a.push('announce:' + role);
    const live = el.getAttribute && el.getAttribute('aria-live');
    if (live && live !== 'off' && hasContent) a.push('aria-live:' + live);
    if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') a.push('invalid');
    if (el.getAttribute && el.getAttribute('data-error')) a.push('data-error');
    // Toast-likely classes — heuristic, opt-in. Empty toast wrappers are skipped.
    const cls = (el.className && typeof el.className === 'string') ? el.className : '';
    if (/\\b(toast|notification|snackbar|error-banner)\\b/i.test(cls) && hasContent) a.push('toast');
    return a.length ? a : undefined;
  };

  // Stable identifier for an element — DOES NOT include the live accessible
  // name so that value/text changes register as MODIFY rather than ADD+REMOVE.
  // Priority: data-testid > linked <label> text > id attribute > role+chain+sibling-index.
  const stableKeyFor = (el, role, parentRoleChain, siblingIdxAmongInteresting) => {
    const tid = el.getAttribute && el.getAttribute('data-testid');
    if (tid) return 'testid:' + tid;
    const elId = el.getAttribute && el.getAttribute('id');
    if (elId && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
      // For form controls with a stable id, prefer that — name/value change won't perturb the key.
      return 'inputid:' + elId;
    }
    // Linked label
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && elId) {
      const lbl = document.querySelector('label[for="' + CSS.escape(elId) + '"]');
      if (lbl) return 'labeled:' + (lbl.textContent || '').trim().slice(0, 60) + '|' + (role || el.tagName.toLowerCase());
    }
    return (role || el.tagName.toLowerCase()) + '|' + parentRoleChain.join('>') + '|' + siblingIdxAmongInteresting;
  };

  // Collect nodes — DFS, capturing only interesting ones.
  const out = [];
  const sibCounts = new Map();
  const walk = (el, parentRoleChain) => {
    if (!el || el.nodeType !== 1) return;
    if (isShellSkipped(el)) return;
    const r = roleOf(el);
    const tag = el.tagName;
    const interesting =
      INTERESTING_ROLES.has(r) ||
      INTERESTING_TAGS.has(tag) ||
      (el.hasAttribute && el.hasAttribute('data-testid')) ||
      (el.getAttribute && ANOMALY_ATTRS.some(a => el.getAttribute(a) !== null && el.getAttribute(a) !== 'false' && el.getAttribute(a) !== 'off'));
    let nextChain = parentRoleChain;
    if (interesting) {
      const chainKey = parentRoleChain.join('>');
      const sibCountKey = chainKey + '|' + (r || tag.toLowerCase());
      const sibIdx = sibCounts.get(sibCountKey) || 0;
      sibCounts.set(sibCountKey, sibIdx + 1);
      const stableKey = stableKeyFor(el, r, parentRoleChain, sibIdx);
      let h = 0;
      for (let i = 0; i < stableKey.length; i++) h = ((h << 5) - h + stableKey.charCodeAt(i)) | 0;
      const id = (h >>> 0).toString(36);
      const node = {
        id,
        role: r || tag.toLowerCase(),
        name: accName(el),
      };
      const st = stateOf(el);
      if (st) node.state = st;
      const tid = el.getAttribute && el.getAttribute('data-testid');
      if (tid) node.testid = tid;
      const anom = anomalyOf(el, r);
      if (anom) node.anomaly = anom;
      out.push(node);
      nextChain = parentRoleChain.concat([r || tag.toLowerCase()]);
    }
    for (const c of el.children) {
      walk(c, nextChain);
    }
  };
  walk(document.body, [], 0);

  // Sweep console.error captures if your test harness has installed them
  // (e.g., on window.__a11y_console_errors). Optional — empty is fine.
  const consoleErrors = (window.__a11y_console_errors && Array.isArray(window.__a11y_console_errors))
    ? window.__a11y_console_errors.slice(-5) : [];

  // ── Graphics-surface pass — relevant canvas/SVG only ──
  // A surface is the smallest **visually coherent** graphics region the model can drive
  // as a black box. Two canvases at the same position under the same tagged wrapper
  // (e.g. Google Maps stacks a WebGL layer + a 2D raster layer in one <div role="application">)
  // are ONE surface with multiple layers — the model sends one gesture to "map" and
  // the topmost layer's DOM handler routes it. Layer hashes track each independently
  // so the diff fires \`[canvas:painted]\` whenever ANY layer changed.
  const INTERACTIVE_SEL = 'button, a, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [role="heading"], [role="img"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="radio"]';
  // Walk up at most 4 ancestors looking for a code-applied identifier. Returns the
  // matching ancestor element so multiple canvases under the same wrapper group together.
  const findTagOnAncestor = (el) => {
    let cur = el; let depth = 0;
    while (cur && depth < 5) {
      const aL = cur.getAttribute && cur.getAttribute('aria-label');
      const sR = cur.getAttribute && cur.getAttribute('role');
      const tid = cur.getAttribute && cur.getAttribute('data-testid');
      const eid = cur.id && !/^:r/.test(cur.id) ? cur.id : '';
      if (aL || tid || eid || sR === 'application' || sR === 'img' || sR === 'figure') {
        return { tagEl: cur, sid: aL || tid || eid || (sR + '@' + depth), origin: depth === 0 ? 'self' : 'ancestor:' + depth };
      }
      cur = cur.parentElement; depth++;
    }
    return null;
  };
  const isVisible = (el) => {
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const cs = window.getComputedStyle(cur);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      cur = cur.parentElement;
    }
    return true;
  };
  // Pass 1: collect candidate layers (each canvas/svg passing size+tag+managed checks).
  const candidates = [];
  for (const el of document.querySelectorAll('canvas, svg')) {
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 200) continue;
    if (!isVisible(el)) continue;
    const tag = findTagOnAncestor(el);
    if (!tag) continue;
    if (el.querySelector(INTERACTIVE_SEL) != null) continue;  // a11y-managed (per-shape buttons)
    let hash, empty = false;
    try {
      if (el.tagName === 'CANVAS') {
        const off = document.createElement('canvas'); off.width = 16; off.height = 16;
        const ctx = off.getContext('2d'); ctx.drawImage(el, 0, 0, 16, 16);
        const d = ctx.getImageData(0, 0, 16, 16).data;
        let h = 0; let opaque = 0;
        for (let i = 0; i < d.length; i += 4) {
          const g = (d[i] + d[i+1] + d[i+2]) / 3 | 0;
          h = (((h << 5) - h) + g) | 0;
          if (d[i+3] > 0) opaque++;
        }
        hash = (h >>> 0).toString(36);
        empty = opaque === 0;
      } else {
        const s = el.outerHTML; let h = 0;
        for (let i = 0; i < s.length; i++) h = (((h << 5) - h) + s.charCodeAt(i)) | 0;
        hash = (h >>> 0).toString(36);
        empty = s.length < 200; // empty SVG ~= no real geometry
      }
    } catch (e) { hash = 'err'; }
    candidates.push({ el, rect: r, tag, hash, empty, kind: el.tagName === 'CANVAS' ? (el.getContext && (function(){try{return el.getContext('webgl')||el.getContext('webgl2')?'webgl':'canvas2d';}catch(_){return 'canvas2d';}})()) : 'svg' });
  }
  // Pass 2: group candidates by (tagEl, bbox≈) into one surface each.
  const surfaces = [];
  const bboxOverlap = (a, b) => {
    const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const inter = ix * iy;
    const ua = a.width * a.height, ub = b.width * b.height;
    return inter / Math.min(ua, ub);
  };
  for (const c of candidates) {
    let group = surfaces.find((g) => g.tagEl === c.tag.tagEl && bboxOverlap(g.bbox, c.rect) > 0.8);
    if (!group) {
      group = {
        surfaceId: c.tag.sid.slice(0, 80),
        tagEl: c.tag.tagEl,
        bbox: c.rect,
        w: Math.round(c.rect.width), h: Math.round(c.rect.height),
        tagOrigin: c.tag.origin,
        layers: [],
      };
      surfaces.push(group);
    }
    group.layers.push({ layerIdx: group.layers.length, kind: c.kind, canvasHash: c.hash, empty: c.empty });
  }
  // Drop fully-empty groups (all layers empty) — purely buffer plumbing.
  for (let i = surfaces.length - 1; i >= 0; i--) {
    if (surfaces[i].layers.every((l) => l.empty)) surfaces.splice(i, 1);
  }
  for (const s of surfaces) delete s.tagEl, delete s.bbox;

  return JSON.stringify({
    url: location.href,
    title: document.title,
    capturedAt: Date.now(),
    nodes: out,
    consoleErrors,
    surfaces,
  });
})()
`;

// ── 2. CLI ────────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function parseExistingMd(path) {
  if (!existsSync(path)) return { nodes: [], url: '', title: '', surfaces: [] };
  const txt = readFileSync(path, 'utf8');
  // Grab the LAST json block — that's the full tree. The earlier block(s)
  // are diff/anomaly sections that don't carry a `nodes` array.
  const matches = [...txt.matchAll(/```json\s+([\s\S]+?)```/g)];
  if (!matches.length) return { nodes: [], url: '', title: '', surfaces: [] };
  const last = matches[matches.length - 1][1];
  try {
    const parsed = JSON.parse(last);
    return { nodes: parsed.nodes || [], url: parsed.url || '', title: parsed.title || '', surfaces: parsed.surfaces || [] };
  } catch {
    return { nodes: [], url: '', title: '', surfaces: [] };
  }
}

function diffSurfaces(prev, curr) {
  const prevById = new Map((prev || []).map((s) => [s.surfaceId, s]));
  const out = [];
  for (const s of curr || []) {
    const p = prevById.get(s.surfaceId);
    if (!p) {
      out.push({ surfaceId: s.surfaceId, kind: 'appeared', w: s.w, h: s.h, layers: (s.layers || []).length });
      continue;
    }
    // Compare per-layer hashes
    const pLayers = p.layers || [];
    const cLayers = s.layers || [];
    const changes = [];
    const maxN = Math.max(pLayers.length, cLayers.length);
    for (let i = 0; i < maxN; i++) {
      const pl = pLayers[i], cl = cLayers[i];
      if (!pl && cl) changes.push({ layerIdx: i, kind: 'layer-appeared', to: cl.canvasHash });
      else if (pl && !cl) changes.push({ layerIdx: i, kind: 'layer-gone', from: pl.canvasHash });
      else if (pl && cl && pl.canvasHash !== cl.canvasHash) changes.push({ layerIdx: i, kind: 'layer-painted', from: pl.canvasHash, to: cl.canvasHash });
    }
    if (changes.length) out.push({ surfaceId: s.surfaceId, kind: 'painted', w: s.w, h: s.h, totalLayers: cLayers.length, changes });
  }
  for (const [id, p] of prevById) {
    if (!(curr || []).some((s) => s.surfaceId === id)) out.push({ surfaceId: id, kind: 'gone', w: p.w, h: p.h });
  }
  return out;
}

function diffNodes(prev, curr) {
  const prevById = new Map((prev || []).map((n) => [n.id, n]));
  const currById = new Map((curr || []).map((n) => [n.id, n]));
  const added = [];
  const removed = [];
  const modified = [];
  for (const [id, n] of currById) {
    if (!prevById.has(id)) {
      added.push(n);
    } else {
      const p = prevById.get(id);
      if (JSON.stringify(p) !== JSON.stringify(n)) modified.push({ before: p, after: n });
    }
  }
  for (const [id, n] of prevById) {
    if (!currById.has(id)) removed.push(n);
  }
  return { added, removed, modified };
}

function anomaliesIn(nodes) {
  return nodes.filter((n) => n.anomaly && n.anomaly.length);
}

// Error-like words that signal "the user should not just sail past this step."
// Matched against the NEW text of a node whose name changed, or against text
// that newly appeared on the page. Word boundaries are LEADING-only — the
// trailing edge is left loose because a11y trees concatenate sibling text
// without separators, so a real "...required" message ends up glued to the
// next button label ("requiredSign in"), defeating a trailing \b.
const ERROR_PATTERN = /\b(error|invalid|required|failed|forbidden|denied|unauthorized|missing|conflict|stale|exceeded|rejected|warning|cannot|unable|enter\s+a\s+valid|must\s+be|is\s+not\s+valid|please\s+(check|enter|provide|fix)|not\s+found|access\s+denied|something\s+went\s+wrong)/i;

function textAnomaliesFromDiff(diff) {
  const out = [];
  for (const n of diff.added) {
    if (n.name && ERROR_PATTERN.test(n.name)) {
      out.push({ id: n.id, role: n.role, name: n.name, anomaly: ['text-error:added'] });
    }
  }
  for (const m of diff.modified) {
    const before = (m.before.name || '');
    const after = (m.after.name || '');
    if (before === after) continue;
    if (ERROR_PATTERN.test(after) && !ERROR_PATTERN.test(before)) {
      out.push({ id: m.after.id, role: m.after.role, name: after, anomaly: ['text-error:appeared'] });
    }
    // State flips to invalid / busy=true are anomalies regardless of text
    const wasInvalid = !!(m.before.state && m.before.state.invalid);
    const isInvalid = !!(m.after.state && m.after.state.invalid);
    if (!wasInvalid && isInvalid) {
      out.push({ id: m.after.id, role: m.after.role, name: after, anomaly: ['state:invalid'] });
    }
  }
  return out;
}

function summarize(diff, anomNew, consoleErrors, surfaceDiff, surfaces) {
  const lines = [];
  lines.push(`- ${diff.added.length} added · ${diff.removed.length} removed · ${diff.modified.length} modified`);
  if (surfaces && surfaces.length) {
    lines.push(`- ${surfaces.length} graphics surface(s) tracked: ${surfaces.map((s) => `${s.surfaceId}(${s.w}×${s.h}, ${(s.layers||[]).length} layer${(s.layers||[]).length === 1 ? '' : 's'})`).join(', ')}`);
  }
  const sdiff = surfaceDiff || [];
  const painted = sdiff.filter((s) => s.kind === 'painted');
  const appeared = sdiff.filter((s) => s.kind === 'appeared');
  const gone = sdiff.filter((s) => s.kind === 'gone');
  if (painted.length) {
    lines.push(`- ${painted.length} surface(s) painted:`);
    for (const s of painted) {
      const chDesc = s.changes.map((c) => `layer ${c.layerIdx} ${c.kind === 'layer-painted' ? `${c.from}→${c.to}` : c.kind}`).join('; ');
      lines.push(`  - [canvas:painted] ${s.surfaceId} (${s.w}×${s.h}, ${s.totalLayers} layers)  ${chDesc}`);
    }
  }
  if (appeared.length) lines.push(`- ${appeared.length} surface(s) appeared: ${appeared.map((s) => s.surfaceId).join(', ')}`);
  if (gone.length) lines.push(`- ${gone.length} surface(s) gone: ${gone.map((s) => s.surfaceId).join(', ')}`);
  if (anomNew.length === 0 && consoleErrors.length === 0 && !painted.length && !appeared.length && !gone.length) {
    lines.push('- 0 anomalies, 0 console errors');
  } else if (anomNew.length || consoleErrors.length) {
    if (anomNew.length) {
      lines.push(`- ${anomNew.length} anomaly node(s):`);
      for (const a of anomNew.slice(0, 10)) {
        lines.push(`  - [${a.anomaly.join(',')}] ${a.role}: ${JSON.stringify(a.name).slice(0, 120)}`);
      }
      if (anomNew.length > 10) lines.push(`  - …(${anomNew.length - 10} more)`);
    }
    if (consoleErrors.length) {
      lines.push(`- ${consoleErrors.length} recent console error(s):`);
      for (const e of consoleErrors.slice(0, 5)) lines.push(`  - ${String(e).slice(0, 200)}`);
    }
    lines.push('');
    lines.push('**Anomaly signal raised — inspect the full diff section below before deciding the step passed.**');
  }
  return lines.join('\n');
}

function writeMd(path, current, diff, summary) {
  const { url, title, capturedAt, nodes, consoleErrors, surfaces } = current;
  const ts = new Date(capturedAt || Date.now()).toISOString();
  const diffBlock = JSON.stringify(diff, null, 2);
  const full = JSON.stringify({ url, title, nodes, consoleErrors, surfaces: surfaces || [] }, null, 2);
  const md = [
    `# a11y snapshot — ${ts}`,
    `URL: ${url}`,
    `Title: ${title}`,
    '',
    '## Anomaly summary',
    summary,
    '',
    '## Diff vs previous',
    '```json',
    diffBlock,
    '```',
    '',
    `## Full tree (${(nodes || []).length} nodes)`,
    '```json',
    full,
    '```',
    '',
  ].join('\n');
  writeFileSync(path, md);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'print-helper') {
    process.stdout.write(BROWSER_HELPER);
    return;
  }
  const path = process.argv[3];
  if (!path || (cmd !== 'diff' && cmd !== 'full')) {
    console.error('Usage: a11y-snap.mjs (diff|full) <snapshotFile>  < <currentJson>');
    console.error('       a11y-snap.mjs print-helper');
    process.exit(2);
  }
  const raw = (await readStdin()).trim();
  if (!raw) {
    console.error('a11y-snap: empty stdin');
    process.exit(2);
  }
  let current;
  try {
    current = JSON.parse(raw);
  } catch (e) {
    console.error('a11y-snap: bad JSON on stdin: ' + e.message);
    process.exit(2);
  }
  current.capturedAt = current.capturedAt || Date.now();
  const prev = cmd === 'full' ? { nodes: [], surfaces: [] } : parseExistingMd(path);
  const diff = diffNodes(prev.nodes, current.nodes);
  const surfaceDiff = diffSurfaces(prev.surfaces || [], current.surfaces || []);
  const anomNew = anomaliesIn(diff.added)
    .concat(anomaliesIn(diff.modified.map((m) => m.after)))
    .concat(textAnomaliesFromDiff(diff));
  const consoleErrors = current.consoleErrors || [];
  const summary = summarize(diff, anomNew, consoleErrors, surfaceDiff, current.surfaces || []);
  writeMd(path, current, diff, summary);
  process.stdout.write(summary + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
