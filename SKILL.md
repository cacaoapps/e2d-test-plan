---
name: e2e-test-plan
description: |
  MANDATORY for any artifact that walks a tester through a real product. Invoke this skill BEFORE writing any of: E2E test plan, end-to-end test plan, user journey tests, QA test plan, manual test script, regression test plan, smoke test plan, acceptance test plan, tester runbook, manual QA runbook, release-check runbook, browser-MCP walkthrough, device verification checklist, or any "Phase X — E2E" / "Phase X — manual QA" deliverable in a project plan. Also invoke when the user asks to validate a feature manually, hand testing off to a QA person, prepare tests for a tester agent, or document how to verify a build before shipping.

  The skill produces ONE OR MORE realistic user journey stories — complete sessions from app open to close — NOT a feature matrix, NOT an area-grouped checklist (e.g. "5.1 Login, 5.2 Pipeline flow, 5.3 Tasks flow…"), NOT a per-screen test case grid. Each story is a real mission a real user pursues; features get exercised as a natural consequence. Output is a markdown plan with checkboxes a tester runs top to bottom without artificial state setup.

  If you find yourself about to write section headings like "5.X Feature Flow" or "Test Case N", STOP and invoke this skill instead — that format is the exact anti-pattern this skill exists to prevent.
---

# E2E Test Plan Generator

This skill produces E2E test plans as **realistic user journey stories**, not the traditional matrix-style test case grids that try to cover every combination and usually fail. The output is a markdown file with checkboxes that a tester (human or agent) can run top-to-bottom without setting up artificial state — each step follows naturally from the previous one within a single user session.

## What is a "story" in this skill

A story is **one complete user session driven by a real mission** — from app open to app close. The mission is the engine; the steps describe how the user pursued it. Narrative, not feature list. A single well-chosen mission naturally exercises most of an app's features along the way.

Stories are NOT: a single user intent or feature, a short flow ("just login"), a matrix row, a coverage map walked end-to-end.

Stories ARE: a coherent professional or personal mission, typically dozens of steps covering many features as a consequence of the mission, modeled on what users actually do (detours and corrections included), independent or sequenced.

**Default to one story.** Add more only when one journey can't reasonably cover the scope — fundamentally different user roles (admin vs end-user), uninstall/reinstall flows, or a single story would balloon past one tester sitting.

**Multiple stories should chain to minimize staging.** If Story 1 ends with a populated project, Story 2 starts from it rather than rebuilding. Each story still declares preconditions — but "continues from Story 1" is a valid one. Clean state only when chaining doesn't fit (e.g., the story's whole point is first-launch behavior).

## Core philosophy

Feature × scenario matrices fail because state setup per row is brittle and skipped. Stories instead: a realistic user opens the app and pursues something meaningful; each step naturally produces state for the next; the tester runs steps in order.

**The story is also the acceptance criterion.** A broken step means a broken system — fix the system, replay the story from the top. Iterate until one clean end-to-end run passes with zero fixes. The clean run is the deliverable. The plan is the spec; the shipped system catches up to the plan.

## The process — four stages, in order

Work through these in order. **Do not jump straight to writing the plan.** Scope → knowledge → story → plan.

### Stage 1 — Determine scope

Common scopes: **whole app**, **a feature or feature set** (e.g., "the BOM editor and reliability flow"), **a regression scope** (e.g., "everything affected by the payment refactor"), **a platform slice** (e.g., "iOS-only flows"). If unclear, **ask the user.** Bad scope cascades into a useless plan.

### Stage 2 — Gather knowledge

**From codebase:** entry points (`App.tsx`, `main.dart`, route defs), screens/routes + navigation graph, auth + persisted state (AsyncStorage, cookies, IndexedDB, Keychain, …), platform-specific code (permissions, deep links, push handlers, native modules), third-party integrations (Firebase, payment SDKs, analytics, OAuth), forms/modals/conditional UI/feature flags/role gates.

**From description:** feature list + user types + auth model. Ask about anything ambiguous before continuing.

**Always:** target platforms, test accounts/environments/data the tester needs, and **build the widget map** — every interactive widget on every screen/dialog/drawer/wizard step in scope. Required internal tool for coverage verification.

### Stage 3 — Construct the story (or stories)

The critical stage. Sub-steps in order.

#### 3a. Pick the mission, sketch the session

**Start with the mission, NOT a coverage map.** What is a real user actually trying to accomplish in one sitting — a workday's work, an end-to-end task, a real reason to open the app. Without a real mission you get a contrived feature tour.

Imagine the user pursuing it. Features get touched naturally as a consequence. Example for a professional analysis tool: *engineer logs in → picks org → opens a new project → configures → imports data → fixes issues with the AI assistant → configures parameters → runs analysis → sanity-checks results → iterates → produces a final report.* That mission organically touches auth, org selection, projects, settings, data import, validation, AI, the core feature, results, iteration, and reporting — without consulting a coverage list.

Then bring coverage maps (feature + widget) in as a lens. Where the natural mission *can* pick up an uncovered stop, weave it in. Where it can't, that's a Stage 4 signal. **Coverage enriches; it does not generate.**

#### 3b. One story or several?

**Default to one.** Add more only when at least one is true: fundamentally different user roles can't share one session; some flows require uninstall/reinstall, fresh state, or a different account; flows are mutually exclusive ("trial expiry" vs "active subscription"); a single story would exceed one tester sitting.

**When splitting, chain to avoid staging.** Story 2's preconditions can be "continues from Story 1's end state — project 'X' exists with imported BOM and one completed analysis". Clean state only when chaining doesn't fit (first-launch tests, incompatible premises).

#### 3c. Expand each story into a journey narrative

A few paragraphs of plain prose: starting context (fresh install? logged out? workday morning?), the user's motivation, full sequence of actions including transitions, natural side paths (wrong taps, validation errors, recovery), platform-aware moments where they fit, the conclusion.

The narrative is **part of the output** — it goes at the top of each story, before the steps.

#### 3d. Convert the narrative into steps

Each step has:
- **Intent** — what the user is trying to accomplish, in product-domain language. Good: *"Pin the company-mandated reliability standard to the project."* Bad: *"Click the Pick a dataset button in the Dataset pin section, then in the modal click the row labeled MIL-HDBK-217F-N2 v1 (system) and confirm with Pin."*
- **Expected outcome** — an observable change in the **system's state from the user's perspective**, not a widget appearance. Good: *"The project's pinned dataset is the chosen standard; subsequent actions use it."* Bad: *"Settings page now reads 'Pinned: MIL-HDBK-217F-N2 v1 (system)' with a 'Change…' button next to it."*

**Why it matters:** UI evolves — buttons rename, dialogs become pages, dropdowns become typeaheads. Product features and intent don't. A plan written against intent + observable outcomes is stable across redesigns; same plan runs on yesterday's and tomorrow's app.

**Default to abstraction.** Reach for the most general phrasing that's still verifiable. The tester (human or agent) finds the relevant control by product-domain reasoning — "where does the app let me pin a dataset?" — not label-matching.

**Allowed specificity:** feature name, persona's goal, data being touched, quantitative parameters that matter ("two mission phases, total 2.5h"). Reference real files, fixture paths, credentials, external systems concretely — environment, not UI.

**Forbidden specificity:** button labels, dialog-vs-page, sidebar vs top-nav, inline-edit vs drawer, URL paths (other than the app root), toast/banner copy, widget kind (combobox vs typeahead vs dropdown), screenshot selectors. None are part of the product spec.

**A narrative beat → 1–3 intent-level steps.** Compress when intent is one continuous thought; multiple steps per click is bureaucracy.

#### Concrete expected values for data-producing steps

Steps that produce a measurable result must specify a **concrete expected value** or tight range. "Produces a non-zero λ" hides a bug returning λ=1e-30. "Produces a system λ of approximately 2.1e-6 /h ± 20%" catches it.

The plan must specify inputs concretely enough to forward-compute the expected value — name the 13 BOM rows + their classifications + phase parameters, or reference a fixture that does. For non-deterministic operations (AI generation), specify the expected *shape* and *semantic constraints* — e.g., "AI proposes 3–8 FMECA entries, each with severity 1–10, occurrence 1–10, detection 1–10, and non-empty failureMode/effects.local derived from the BOM rows".

**Allowed in expected outcomes:** quantitative targets with tolerance, counts ("exactly N", "at least M"), semantic enums ("status SUCCEEDED"), cross-references ("matches input from step N", "sum equals per-row total").

**Forbidden:** vague liveness ("produces a value", "is non-zero", "shows something"); "system works" / "no errors" without specifying what would constitute an error; UI-shape checks.

### Stage 4 — Coverage check (internal)

Two checks. **Feature coverage primary; widget coverage secondary.**

1. **Feature coverage** — every screen/feature/branch from Stage 2 is touched by at least one story. Missed feature = serious gap.
2. **Widget coverage** — every widget in the widget map is exercised in at least one step. Catches niche buttons; less severe than a missed feature.

If a feature or widget can't be folded into any realistic mission, that's a signal — orphan UI, missing persona, or feature nobody actually uses. Don't invent a contrived journey to tick a box.

When a check fails, in order of preference: extend an existing story (best — keeps it story-shaped), pick a different mission, add a small dedicated segment, or flag to the user. Neither map appears in the final output — both are internal.

## Side paths

Side paths are variations or error recoveries that fit naturally into the journey — not a separate testing category. Include them only when a real user would plausibly hit them as part of this story. Examples:

- A CSV import where one column doesn't auto-map → tester manually maps it, then continues
- A form submission that fails validation → tester corrects and resubmits
- A network drop mid-action → tester sees the offline indicator, waits, retries

Side paths are written as nested checkboxes under the step they branch from, with a clear "return to main flow" marker. Don't invent side paths that wouldn't realistically come up in this story. Side paths are also a convenient place to land any widget that has no other natural home in a story.

## Widget coverage — stops along the journey (required internal check)

Widgets are stops a mission passes through, not the journey itself. The widget map is a checklist of stops the story should pick up. When a widget can't be folded into any mission: (a) natural side-detour in an existing story? (b) different mission that exercises it? (c) flag to the user — orphan UI. **Don't invent contrived journeys to tick widgets.**

Every distinct interactive widget must be exercised in at least one step across the plan. Catches niche buttons, less-used menu items, one-off toggles that feature-level thinking misses.

### What counts as a widget

Buttons (incl. icon-buttons, toolbar actions, FABs, kebab items); text/number inputs, textareas, search boxes; dropdowns, comboboxes, typeaheads; checkboxes, radios, toggles, sliders, segmented controls; tabs (each tab one widget); drag-drop zones, file pickers; sortable/filterable column headers; drawer/dialog/modal open triggers (the trigger, not the dialog); custom interactive elements (canvas nodes, draggable handles, interactive chips, clickable badges); keyboard-only widgets (shortcuts with no UI affordance still count).

### What does NOT count

Static text, decorative icons, read-only badges/pills, display-only charts (their interactive controls — tooltips, legend toggles, axis pickers — DO count), browser-native chrome.

### Disambiguation

- **Repeating row templates** — the kebab on each row is **one** widget. Exercising on any single row covers all.
- **Same-looking widgets in different contexts** — "Save" in Part Detail Drawer vs in Mission Profile editor are **distinct** (different state, different handlers).
- **Role-gated widgets** — count once, in the story where the role-appropriate user exercises it. Verifying a role *can't* see it is a separate check, not a substitute.
- **Disabled-tooltip widgets** — exercised when (a) any user exercises it enabled AND (b) at least one tester sees the disabled-state tooltip.
- **Wizard steps** — each step's "Next"/"Back"/"Cancel" is distinct per step.

### Process

1. **Stage 2:** enumerate widget map per-surface, organized by screen.
2. **Stage 3:** tick widgets off as you draft stories; maximize ticks per story.
3. **Stage 4:** for unticked widgets — extend an existing story (preferred), add a small dedicated segment, or flag if genuinely unreachable.

Map is internal — not in the final output.

## How the testing agent drives the system

Three layers: client (browser tab — web default, Chrome DevTools MCP), API server, state store (DB-agnostic — Firestore/Postgres/Mongo/Supabase all the same). The agent is the **supervisor**: triggers actions through the client, observes via two cheap channels — a11y diffs (client) and trigger-and-poll (async work) — and decides per step. Two principles:

1. **System under test is a black box.** The agent triggers and observes; it does not consume internal state — model responses, server-side traces, intermediate payloads. Recorded by the system for offline analysis, never in the agent's context.
2. **Verify through observable state, not internal output.** "Did the FMECA worksheet get 3–8 entries?" is a state-store query that returns a count. "Did the AI propose the right thing?" is product behavior the system handles; the agent never reads the model's response text.

Together these let a 30-step run that previously burned 400K+ tokens fit in ~70–100K.

## Driving the client with a11y diffs (web-app technique)

The agent drives the browser via **Chrome DevTools MCP**. Naive "full a11y snapshot before and after every step" burns 5–10 K tokens per snapshot × dozens of steps. The technique below cuts that to a few hundred tokens per step while keeping the LLM in the loop on unexpected behavior.

### Mandatory snapshot discipline

**NEVER use `take_snapshot` for routine state checking.** It dumps the full a11y tree (5–10 K tok) into context every call — the exact failure mode this skill exists to fix.

**ALWAYS use `evaluate_script` to invoke the a11y helper IIFE** (printed by `node scripts/a11y-snap.mjs print-helper`). The IIFE returns a compact JSON string. Pipe it to `node scripts/a11y-snap.mjs <full|diff> <snapshotFile>` which prints a ~300-tok summary. The agent reads only the summary.

`take_snapshot` is permitted exactly when the agent is **completely lost** about the page (unexpected navigation, page crash + recovery, a surface the helper couldn't characterize). Use once to re-orient, then return to the helper flow. More than 2–3 `take_snapshot` calls per story = discipline has slipped.

For clicks/fills where chrome-devtools' `click`/`fill` tools demand a `uid`, use `evaluate_script` instead: `document.querySelector(...)?.click()` or the React-native value setter pattern. The helper's stable IDs let you reference elements across the run.

#### Filling React-controlled inputs (REQUIRED pattern)

**Do not use `fill_form` or assign `el.value = ...` directly on React inputs.** Both set the DOM value without firing the synthetic `input` event React listens to — the component's state never updates and the value is silently dropped on submit. Single most common cause of "I filled the form, why did it save junk?"

```js
() => {
  const set = (sel, val) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, sel };
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, sel, value: el.value };
  };
  return [
    set('input[name="refdes"]', 'R1'),
    set('input[name="name"]', 'Pull-up resistor 10kΩ'),
  ];
}
```

Native setter bypasses React's value-tracking guard; the bubbling `input` event reaches React's synthetic event handler. Always verify by reading `el.value` back — mismatch means the selector or setter chain is wrong.

For Radix/shadcn comboboxes/popovers/listboxes that aren't native `<input>`s, click the trigger then click the option (`[role="option"][data-value="..."]`). Don't `set` non-input components.

### Workflow per step

1. **Capture** via `evaluate_script` running the helper IIFE. Returns `{url, title, capturedAt, nodes, consoleErrors, surfaces}`. Node ids are deterministic hashes of (testid / form input-id / role + parent-chain + sibling-index) — **stable across content changes**, so a filled textbox shows as `modified`, not `added+removed`.
2. **Reduce + persist** by piping the JSON to `node scripts/a11y-snap.mjs <mode> <snapshotFile>`:
   - `full` — overwrites the snapshot file. Use after navigation / hard refresh / any time the previous tree is stale.
   - `diff` — computes `{added, removed, modified}` vs the previous tree, runs anomaly detection, writes the new state back, prints the **anomaly summary** to stdout.
3. **Read the summary** — always. 1–10 lines: `N added · M removed · K modified`; `0 anomalies, 0 console errors` (green); or `[announce:alert] dialog: "..."` / `[aria-live:assertive] ...` / `[invalid] textbox: ...` / `[text-error:appeared] form: "...required..."` — **anomaly raised, inspect the file's `## Diff vs previous` section before declaring the step passed.**
4. **Drill into the file** only when the summary signals anomaly or you need specific node ids/values. The file survives across compactions and sub-agent dispatches.

### When `full` vs `diff`

- `full` after: URL navigation, hard refresh, browser back/forward, any explicit new-baseline event.
- `diff` for: every same-page step (fills, dialog opens, applies, computations).

**Default `diff`.** Use `full` only with a reason. The plan annotates each step explicitly so the running LLM doesn't decide on the fly.

### Anomaly detection — what it catches

- `role=alert|alertdialog|status` with non-empty content
- `aria-live` other than `off` with non-empty content
- `aria-invalid="true"`, `data-error` set
- Class matches `/toast|notification|snackbar|error-banner/i` with content
- Text (new or modified) matches the error pattern `/error|invalid|required|failed|forbidden|denied|unauthorized|missing|conflict|stale|exceeded|rejected|warning|cannot|unable|enter\s+a\s+valid|must\s+be|is\s+not\s+valid|please\s+(check|enter|provide|fix)|not\s+found|access\s+denied|something\s+went\s+wrong/i`
- State flips: valid → invalid, non-busy → busy
- `window.__a11y_console_errors` has new entries (install via `window.__a11y_console_errors=[]; const o=console.error; console.error=(...a)=>{window.__a11y_console_errors.push(a.map(String).join(' ')); o.apply(console,a);};`)

If **no anomaly** but the diff shows unexpected `added/removed/modified` counts vs the step's intent, the LLM should still inspect the file's diff section. "0 added · 0 removed · 1 modified" after "click Sign in" is suspicious — Sign in should at minimum change URL, button state, or content.

### Helper file

`scripts/a11y-snap.mjs` ships with the skill. Print the browser helper IIFE with `node scripts/a11y-snap.mjs print-helper`, wrap in `() => (<paste>)`, pass to `evaluate_script`. The Node CLI handles diff + persistence.

### Plan-step annotation

Each interactive step carries a trailing backticked snapshot hint:

```
- [ ] 5. <intent>  →  Expected: <outcome>  `[snapshot: diff]`
- [ ] 6. <intent — navigation>  →  Expected: <outcome>  `[snapshot: full]`
```

Default `diff` if missing. Side paths inherit the parent's hint unless the side path itself navigates.

### Supervisor mindset

The LLM is the supervisor of every step. The diff summary is the supervisor's input on each turn. Anomaly → drill into the diff, decide bug or note, follow the fix-and-resume-then-confirm protocol. Clean summary + diff matches intent → check the step off. The plan + helper + supervising LLM form a closed loop; the helper does NOT replace LLM judgment, it makes LLM reasoning cheap enough to apply per step.

## Driving graphics surfaces (canvas / un-managed SVG)

Some interactive surfaces draw their content as pixels (`<canvas>`, WebGL) or as SVG shapes the a11y tree doesn't expose individually (a map's tile layer, a chart's data series, a free-form drawing area). The a11y-diff flow above is **blind** to whatever happens inside them: a node moves, a city becomes selected, a layer turns red — the diff still prints `0 added · 0 removed · 0 modified`. This section adds **on-demand visual observation** for these surfaces while keeping every other element on the page driven by the unchanged a11y-diff flow.

This is **purely additive**. When a page has no relevant graphics surface, the helper, the diff CLI, and the per-step protocol behave exactly as today. When a relevant surface exists, the helper emits one extra signal per surface and the agent gains one extra tool (`screenshot_canvas`) that it MAY use when — and only when — the story explicitly requires perceiving canvas content.

### Detection — what counts as a "relevant" graphics surface

A surface is considered relevant **and** triggers canvas tooling when ALL of the following hold:

1. **Tag:** the element is `<canvas>` OR `<svg>`.
2. **Visible:** no `display: none`, `visibility: hidden`, or `opacity: 0` on the element or any ancestor.
3. **Size:** bounding-box ≥ 200 × 200 px. Smaller surfaces are assumed to be widget chrome (avatar crop, button glyph, sparkline icon) — not user-driven content.
4. **Code-applied identifier — direct or inherited:** the element itself OR an ancestor within **5 levels** carries one of `aria-label`, `role`, `data-testid`, `id` (not auto-generated, i.e. not `^:r`), or `role="application"|"img"|"figure"`. The ancestor walk catches the common pattern where libraries wrap an untagged `<canvas>` in a labeled container — Google Maps' `<div role="application" aria-label="Map">`, React Flow's `<div data-testid="rf__wrapper">`, d3 demos' `<div id="my_dataviz">`. Untagged canvases whose ancestors are also untagged are decorative and ignored.
5. **A11y-unmanaged content:** the surface contains **zero interactive descendants in its own DOM subtree**, where "interactive" = `button | link | input | textarea | select | [role in {button,link,textbox,heading,img,tab,menuitem,option,checkbox,radio}]`. The check is by **DOM-tree descent (`el.querySelector(...)`)**, NOT bounding-box containment. This distinction matters: a full-viewport map canvas has floating UI chrome (search box, controls) visually on top of it, but those chrome elements are siblings in the DOM, not descendants — they don't make the canvas "managed." Conversely, a React Flow SVG with per-node focusable `<g role="button">` children IS managed, and canvas tooling correctly skips it (the a11y-diff flow handles each node natively).

Surfaces failing any of (1)–(5) are invisible to canvas tooling. The skill behaves as today for them and for every non-surface element on the page.

### Stacked surfaces become one — layers

Many libraries stack multiple `<canvas>` or `<svg>` elements at the same position to render in layers (e.g. Google Maps overlays a WebGL vector layer on top of a 2D raster layer; charting libs separate background, data, and interaction layers). They share a tagged wrapper and the user perceives them as a single surface.

Detection groups stacked surfaces into one entry: candidates that share the **same tagged ancestor element** AND whose bounding boxes overlap by **>80%** of the smaller area are merged. The resulting surface has a `layers` array with one entry per stacked element, each with its own `canvasHash`. The model sends one gesture to the surface; DOM event bubbling resolves which layer's handler runs. Layer hashes track repaints independently so the diff fires `[canvas:painted]` when **any** layer changes.

**Empty-group filter:** if every layer in a group is detected as empty (canvas: zero opaque pixels; SVG: <200 bytes of serialized markup), the entire surface is dropped from the snapshot — it's a buffer that hasn't been drawn to. Empty individual layers within a *partially* painted group ARE kept, so the diff can fire when an idle layer (e.g. an unused 3D buffer) later becomes active.

### Helper change — emit `surfaces[]` with per-layer hashes

The browser-side helper (`scripts/a11y-snap.mjs print-helper`) runs a second pass after its existing a11y-tree walk, producing the `surfaces` field of the returned JSON. The full source lives in `scripts/a11y-snap.mjs`; the structure is:

1. **Walk candidates.** For every `<canvas>` and `<svg>` in the document, apply rules (1)–(5) above. Reject failures.
2. **Hash per candidate.**
   - `<canvas>`: draw the canvas into a 16×16 offscreen, sample the pixels, build a small grayscale perceptual hash. Also count opaque pixels — zero ⇒ `empty: true`.
   - `<svg>`: hash `outerHTML`. Markup <200 bytes ⇒ `empty: true`.
3. **Group candidates into surfaces.** A candidate joins an existing group if it shares the same tagged ancestor element AND its bbox overlaps the group's bbox by >80% (smaller-area normalized). New candidate ⇒ new group with `layers: []`.
4. **Drop fully-empty groups** (every layer empty). Empty layers inside otherwise-painted groups are kept so a future activation fires `[canvas:painted]`.
5. **Detect kind** per layer: `webgl` if a WebGL context is available on the canvas, else `canvas2d`; `svg` for SVGs.

Returned shape:

```json
{
  "url": "...",
  "title": "...",
  "capturedAt": 1780000000000,
  "nodes": [...],
  "consoleErrors": [],
  "surfaces": [
    {
      "surfaceId": "Map",
      "tagOrigin": "ancestor:1",
      "w": 1440, "h": 900,
      "layers": [
        { "layerIdx": 0, "kind": "webgl",    "canvasHash": "0",      "empty": true  },
        { "layerIdx": 1, "kind": "canvas2d", "canvasHash": "59jb3b", "empty": false }
      ]
    }
  ]
}
```

**Measured overhead:**
- Pages with no relevant surface (e.g. plain forms): **zero bytes added** to the JSON; pass runs in <1 ms.
- A11y-managed surfaces (React Flow RBD: 2 SVGs at 810×638 and 832×655 with focusable per-node buttons): correctly skipped, **zero bytes added**, ~0.4 ms total.
- Real opaque map (Google Maps 1440×900, WebGL + 2D canvas stacked): one surface entry, two layers, ~120 bytes added, hash pass <2 ms.
- Real opaque SVG (d3 treemap 445×445): one surface entry, one layer, ~75 bytes added, hash pass <1 ms.

The CLI `a11y-snap.mjs diff` learns one new comparison: per `surfaceId`, walk the `layers` array against the previous snapshot's. For each layer whose `canvasHash` differs, append a `[canvas:painted] <surfaceId> (<w>×<h>, <n> layers)  layer <i> <fromHash>→<toHash>` line to the summary. New surfaces emit `[canvas:appeared]`; removed surfaces emit `[canvas:gone]`. The model sees, in the diff output, that the surface changed — without seeing any pixels. The model then decides whether the step's intent requires perceiving the change.

### The `screenshot_canvas` tool — on-demand, story-driven, never default

When a story step is annotated `[canvas-check: <surfaceId>]`, the agent invokes `screenshot_canvas(surfaceId, {scale=0.5, cropAround?, settleMs=500})`. Defaults: half-res of the full visible surface, 500 ms quiescence cap, webp@70. Crop-around-point is preferred when the story names a focal point.

Full implementation — settle wait via rAF + 2-frame stability, raster for canvas + SVG, blob → dataUrl — is in `references/canvas-helper.md`. The contract surfaces here: model passes coords in **original surface space** (the helper returns `sourceW`/`sourceH`/`scale` so the math is on the model's side); the click dispatcher does NOT auto-scale.

### Plan-step annotations — three tags now

| Tag | Meaning |
|---|---|
| `[snapshot: full]` | After navigation; helper writes fresh baseline |
| `[snapshot: diff]` | Default; helper writes diff vs previous baseline |
| `[canvas-check: <surfaceId>]` | After diff, model captures a `screenshot_canvas(surfaceId)` — author specifies which surface; appended to a normal `[snapshot: ...]` tag, not a replacement |
| `[canvas-check: <surfaceId> @ {x,y,r}]` | Same, cropped around an original-surface-space point with radius `r` |

Steps without `[canvas-check]` MUST NOT capture screenshots. The model does not decide on the fly to "peek at the canvas to be safe" — that path is what reintroduces the token explosion this skill exists to prevent. The plan is the spec; if the story needs canvas observation, the plan author writes it in.

### Token budget for canvas observation (measured)

Image tokens for Claude vision: `(W × H) / 750`. Validated live:

| Output | Pixels | Tokens |
|---|---|---|
| Full browser viewport (1440 × 900) | 1,296,000 | 1728 |
| Google Maps map surface, half-res (720 × 450) | 324,000 | **432** |
| d3 treemap surface, half-res (223 × 223) | 49,729 | **66** |
| d3 treemap, crop-around-point 160×142 at 0.5× (80 × 71) | 5,680 | **8** |

The expensive case is a full-viewport map at half-res (~432 tok). Smaller surfaces (charts, small canvases) are far cheaper. Crop-around-point gives an order-of-magnitude reduction when the story names a focal point (a clicked cell, a hovered marker, a selected region).

Per-story budget on a 6-step Google Maps story (3 canvas-checks): **~2055 tok total** including triggers, summaries, and three screenshots. Helper output JSON (8–15 KB per step) is written to file and **never enters model context**. The model reads only the CLI summary plus, on annotated steps, one downscaled image.

**Hard rules:**
- One screenshot per annotated step.
- Untagged or undersized surfaces emit no signal and accept no screenshot — they're outside the skill's view.
- Steps without `[canvas-check]` MUST NOT capture screenshots. Even if the diff fires `[canvas:painted]`, the model proceeds without peeking unless the plan says to. This is the discipline that keeps a 30-step run inside the budget.

## Driving async work as a black box (trigger-and-poll)

Many product steps kick off **internal** work the testing agent does not need to watch: an AI proposer generates a draft (LLM streaming back through the API to the client), a long compute runs server-side, a background job processes a queue. The naive driver pattern is to await the response inside the click handler and let the streaming buffer flow back through `evaluate_script` into the agent's context — that's how a 30-step run ends up costing 400K tokens, with the bulk of it being LLM response text the agent should never have seen.

**The correct pattern is trigger-and-poll:**

1. **Trigger the action.** Click the button via `evaluate_script` (or equivalent) that returns immediately with a short success marker, e.g. `{triggered: true, at: Date.now()}`. The action's actual work happens server-side; the agent does not await it.
2. **Poll the state store** for the side-effect: a new document with `status: PROPOSED`, an entry count that increased, a `lastRunId` that changed. The agent reads only the **structural outcome** — counts, status enums, IDs, boolean flags — not the response text, prompt, model output, or rendered content.
3. **Assert on the structural outcome** using a typed assertion helper (see below). The output is short and explicit: `OK 13` / `FAIL got 10 expected 13`.

**The agent never reads:**
- LLM response text (the prompt the model saw, the streaming buffer, the final assistant message body)
- Server-side computation traces, intermediate payloads, log lines
- Rendered content of long-form fields (the chat message text, the proposal's `reasoning` blob, etc.)

**The agent always reads:**
- Counts (rows, entries, nodes, edges)
- Status enums (`SUCCEEDED`, `PROPOSED`, `APPLIED`, `DEPRECATED`, `ACTIVE`)
- IDs and the existence of new records
- Quantitative ranges (system λ ∈ [X, Y], MTBF ∈ [X, Y], total Δt = 2.5 h)
- The a11y diff summary (anomalies, count of added/removed/modified nodes)

The model's prompt + response are still **recorded** by the system for offline analysis — that's a product feature, not testing-agent input. The agent reads those later if a step's structural outcome was wrong and a human needs to understand why, but they don't enter the live driving loop.

### Assertion-helper

A tiny project-stack-specific CLI: `npx <runner> scripts/assert.<ext> <check-name> [args…] --eq <expected>` → prints `OK <value>` or `FAIL got <X> expected <Y>` on one line. Plan steps reference checks by name; the plan author wires each name to a real query against the project's database. Sketch + Firestore example: `references/assertion-cli.md`.

### Why this matters

Treating the system as a black box keeps agent context proportional to the **decisions** the agent makes, not the system's internal verbosity. "Apply a proposal" becomes: click button → poll `aiProposals/{id}.status == APPLIED` → assertion returns `OK applied`. ~50 tok of context for a step that could otherwise drag in 20K of streaming model output. It's also more correct: the agent isn't fooled by an LLM that emits a beautiful, plausible-sounding response if the response failed to actually mutate state. The state store doesn't lie; the rendered text might.

## Platform-aware moments

Weave platform-aware moments into the journey **where they fit naturally**. Don't add them as a separate checklist or force them in.

*Mobile (iOS/Android):*
- Permissions dialogs on first use (camera, photos, notifications, location, contacts)
- Deep link entry — user taps a link from email/SMS and lands inside the app
- Push notification arriving mid-journey and being tapped
- App backgrounded and returned to (does state persist?)
- Network dropped and restored
- Force-quit and relaunch — does state persist correctly?
- Rotation, if the app supports landscape
- Keyboard appearing/dismissing over inputs
- Pull-to-refresh
- iOS vs Android divergences worth testing separately (permission UX, share sheets, back gesture)
- Over-the-air updates if applicable (CodePush, Expo Updates)

*Web:*
- Browser back/forward buttons
- URL state and direct-link entry
- Page refresh mid-flow
- Multiple tabs of the same app
- Logged-in session expiring during use

## Output format

Output one markdown file. Header (title, scope, platforms, prerequisites) → "How to use this plan" block (fix-and-resume-then-confirm protocol + bug-vs-note guidance) → one or more `## Story N` sections, each with **Persona**, **Preconditions**, **Narrative** (prose), **Steps** (checkbox list with intent + expected outcome + snapshot hint), optional **End state**.

**Step rules (must follow):**

- Each step = `[Intent] → Expected: [observable product-level outcome]`. Both halves matter. Intent without a verifiable outcome isn't testable.
- Describe **what** the user is trying to do and **what change should result**, never **how to operate the UI**. UI evolves; intent doesn't.
- Data-producing steps specify a **concrete expected value** (or tight range/tolerance) — "produces ~X ± Y%", not "non-zero". If the value depends on inputs, specify the inputs concretely enough to forward-compute it.
- Every UI-interaction step carries a snapshot hint `[snapshot: diff]` (default) or `[snapshot: full]` (after navigation). Steps that need canvas-check also carry `[canvas-check: <surfaceId>]` (optionally with `@ {x,y,r}`).
- The narrative comes before the steps. Side paths are nested checkboxes that return to the main flow.

**Full template + the "How to use this plan" prose** lives in `references/output-template.md` — copy-paste it as the starting skeleton, then fill in.

**Worked example:** `references/example-story.md`.

## Quality bar before delivering

Run through this checklist:

- The story (or stories) read like real user sessions, not feature matrices
- Each story has a narrative section before the steps
- Every step has both an action and an observable expected result
- Side paths appear only where natural and always return to the main flow
- Each story's preconditions are stated explicitly — either fresh state or "continues from Story N"
- Stories that chain leave their End state explicit so the next story has a known starting point
- Platform-aware moments are woven into the journey, not appended as a checklist
- Feature coverage check passes — every in-scope feature is touched
- Widget coverage check passes — every interactive widget in the widget map is exercised in at least one step
- The markdown renders cleanly (checkboxes are `- [ ]` with the space)

## Things to avoid

- **Feature × scenario matrix.** Failure mode this skill exists to fix.
- **Stories built from a coverage map.** Mission-driven; map is a stop list, not a source.
- **Widget coverage outranking feature coverage.** Missed feature > missed widget.
- **Splitting a coherent journey across stories** because it touches several features. One long realistic session > a collection of small ones.
- **Re-doing setup a prior story produced.** Chain from the prior end state.
- **Implicit dependencies between stories.** State preconditions in Story N+1 + End state in Story N.
- **Staging *within* a story.** If a step needs state, an earlier step in the same story creates it.
- **Exhaustive at the expense of realism.** A 200-step contrived journey is worse than a 50-step realistic one.
- **"Verify X works"** as a step. Write the action + the specific expected result.
- **Coverage maps in the output.** Internal tools only.
- **Treating the plan as the deliverable.** The deliverable is a working system that lets a real user replay the story end-to-end. Green checkbox without working feature < red checkbox.
- **Continuing past a broken step "to gather more bugs."** Stop, fix, resume from the broken step. Cascade noise obscures root cause.
- **Patching the plan to dodge a broken step.** Fix the product; if the step is genuinely impossible (feature gone), fix the plan AND escalate.
- **"PASS-with-known-deviation" claims.** A clean run is the only true pass. Document every deviation as a follow-up issue.
- **UI-shape in steps.** Button labels, dialog-vs-page, exact URL paths, toast copy, widget kind — none of these belong in the step. They describe the current UI, not the product.
- **Describing the *how*.** "Click X, then Y, confirm in dialog Z" is implementation, not specification.
- **Over-decomposing a beat.** Multiple steps per click is bureaucracy.
- **Liveness-only outcomes on data-producing steps.** "Non-zero" hides calculation bugs. Specify concrete value (or range) + inputs concretely enough to forward-compute it.
- **Restarting from step 1 after every fix during exploration.** Resume from the broken step. Full restart is the final confirmation pass.
- **Internal AI/server output dripping into agent context.** Triggers + state-store reads only. LLM responses are recorded for offline analysis, not for the live loop.
- **Awaiting async work inside the trigger call.** Trigger returns `{triggered: true}` immediately; poll the state store for the outcome.
- **`take_snapshot` for routine state checks.** Use `evaluate_script` + helper. `take_snapshot` is reserved for "I'm lost about what's on the page" moments.
- **Confusing a code-reload with a state reset.** Dev-server restart leaves the DB untouched. Resume from the broken step.
- **Inventing features** that aren't in the codebase or description. If guessing, ask.

## When to ask the user vs. proceed

**Ask** when scope is ambiguous, auth model / user roles unclear, a feature's purpose isn't obvious, platforms unclear, or you're guessing at something that materially affects the journey.

**Proceed** when scope is concrete and you have enough signal from code/description to reasonably infer intent from common UX patterns.

When in doubt, ask. A short clarifying question is cheaper than a wrong plan.
