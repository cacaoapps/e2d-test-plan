# e2e-test-plan

A Claude Code skill that turns "test my app" requests into **realistic user-journey stories** instead of bloated feature × scenario test matrices.

Built for agent-driven E2E testing: the model drives a browser (Chrome DevTools MCP), reads compact a11y diffs (~300 tok/step) instead of full snapshots (5–10K tok/call), and treats async work + canvas/SVG surfaces as black boxes the supervising LLM never reads into context.

---

## What it does

Given a description of an app, a codebase, or both, the skill produces ONE OR MORE complete user-journey markdown files — full sessions from app-open to app-close, driven by a real user mission. Each step has an **intent** (what the user wants) and an **observable expected outcome** (what the system must demonstrate), at the granularity of decisions, not clicks. A tester (human or agent) runs the steps top-to-bottom.

The plan is also the spec. When a step fails, you fix the system (not the plan) and resume from the broken step. A clean end-to-end replay is the deliverable.

## Why it exists

The default mode for AI-written test plans is a feature × scenario matrix — section headings like `5.1 Login`, `5.2 Project flow`, `5.3 Tasks…`, each with arbitrary state setup. These plans are brittle, ignore real user behavior, and almost always end up half-skipped by the tester.

This skill enforces story-shaped output and provides the runtime techniques to make it cheap:

- **a11y-diff workflow** — a compact `surfaces[]`+`nodes[]` JSON the supervising LLM never reads directly; a tiny CLI emits a 1–10 line summary per step
- **Trigger-and-poll** — the agent kicks off async work and polls the state store for structural outcomes; LLM responses, streaming buffers, and internal traces never enter the testing agent's context
- **Canvas / un-managed-SVG support** — opaque graphics surfaces (maps, charts, diagrams) emit a perceptual-hash signal in the diff so the model knows when something repainted, and an on-demand `screenshot_canvas` tool when the story explicitly requires perceiving pixels
- **Snapshot discipline** — `take_snapshot` is reserved for "I'm lost about what's on the page" emergencies; routine state checking goes through the diff CLI

## Token economics (measured)

| Item | Cost |
|---|---|
| Full a11y snapshot via MCP `take_snapshot` (naive baseline) | 5–10K tok per call |
| This skill's diff-summary per step | ~50–200 tok |
| Canvas/SVG hash overhead per snapshot | 0 bytes when no surface; ~30–120 bytes when present |
| Half-res screenshot of full-viewport map (1440×900 → 720×450) | ~432 tok |
| Half-res screenshot of crop-around-point (160×142 → 80×71) | ~8 tok |
| Validated 6-step Google Maps story with 3 canvas-checks | ~2055 tok total |

A typical 30-step run that previously burned 400K+ tokens fits in **~70–100K**.

## Install

### Via skills.sh CLI (recommended — works for Claude Code, Cursor, Codex, Copilot, Gemini, Cline, etc.)

```bash
npx skills add cacaoapps/e2e-test-plan
```

The `skills` CLI ([vercel-labs/skills](https://github.com/vercel-labs/skills)) detects your agent and drops the skill in the right place.

### Manual install (Claude Code, plain git)

```bash
git clone https://github.com/cacaoapps/e2e-test-plan ~/.claude/skills/e2e-test-plan
```

Or, for a single-user install via symlink:

```bash
git clone https://github.com/cacaoapps/e2e-test-plan /path/to/wherever
ln -s /path/to/wherever ~/.claude/skills/e2e-test-plan
```

### Project-scoped (instead of user-scoped)

Drop the folder under `.claude/skills/` at your project root. Claude Code picks it up the next time the project is opened.

Either way, Claude Code will surface the skill when the task matches the trigger description (E2E test plan, user journey tests, regression plan, QA runbook, etc.).

## Use

In a Claude Code session, ask for:

- "Write an E2E test plan for X"
- "Generate user journey tests for this feature"
- "I need a QA runbook for the release"
- "Produce a manual-test plan a tester can run top-to-bottom"

The skill will:

1. Establish scope (whole app, a feature, regression scope, platform slice)
2. Build a knowledge map (entry points, routes, auth, persisted state, third-party SDKs, widget map, surfaces)
3. Pick a user mission and sketch a session
4. Decide if one story is enough or if you need more
5. Expand each story into a prose narrative
6. Convert each narrative beat into intent + observable-outcome steps with snapshot hints
7. Run feature + widget coverage checks
8. Output a clean markdown file with the narrative + a checklist

## Driving the system

For web apps, the supervising LLM uses Chrome DevTools MCP:

1. Capture the a11y tree via the browser helper (`node scripts/a11y-snap.mjs print-helper`)
2. Pipe the JSON to `node scripts/a11y-snap.mjs (full|diff) <snapshotFile>`
3. Read the 1–10 line summary printed to stdout
4. Drill into the snapshot file only when the summary signals an anomaly or specific assertion

For canvas / SVG widgets the a11y tree doesn't manage (maps, charts, diagrams), the helper emits a `surfaces[]` block with per-layer perceptual hashes. The diff CLI fires `[canvas:painted]` when any layer's hash changes between snapshots — the model sees that the surface changed without reading any pixels. On-demand `screenshot_canvas` is the model's escape hatch, gated to steps the test author has explicitly annotated with `[canvas-check: <surfaceId>]`.

## Repo layout

```
SKILL.md                        # the skill definition Claude Code loads
scripts/a11y-snap.mjs           # browser helper + CLI for snapshot/diff
references/example-story.md     # worked example: narrative → intent steps
```

## What's validated

- A11y-managed surface (React Flow on Relion's RBD page) — correctly skipped by canvas tooling, all nodes/edges driven via normal a11y diff
- Opaque canvas (Google Maps WebGL + 2D raster stacked under a labeled wrapper) — grouped into one surface with two layers, `[canvas:painted]` fired on each map state change, half-res screenshot legible
- Opaque SVG (d3 treemap) — `outerHTML` hash captures color/structure changes, settle wait + crop-around-point + raster-via-Blob all work end-to-end
- 6-step real story (Google Maps search → right-click → search nearby → vegan restaurant → first result) ran inside ~2055 tok of model context

## Versioning

Tag releases as `vX.Y.Z`. Breaking changes to the JSON shape produced by `a11y-snap.mjs` warrant a major bump. The browser helper's IIFE shape is also part of the public contract.

## Contributing

Issues + PRs welcome. Useful contributions:

- Coverage of additional graphics libraries (Mapbox, Leaflet, Chart.js, Plotly, ECharts, etc.) — verify the ancestor-walk and DOM-subtree heuristics hold
- Stack-specific assertion-helper templates (Postgres, MongoDB, Supabase, etc.)
- Worked example stories for different app archetypes (web SaaS, CRUD admin, content site, drawing app)
- Test infrastructure that exercises the `a11y-snap.mjs` CLI end-to-end without a browser

## Discoverability

This skill is designed to be auto-indexed by the open agent-skills ecosystem. Once the repo is public on GitHub with the SKILL.md at the root, it appears in:

- **[skills.sh](https://skills.sh)** — Vercel-run open directory; installable via `npx skills add <owner/repo>`. Indexed automatically from public GitHub repos with a SKILL.md.
- **[skillsmp.com](https://skillsmp.com)** — Indexes public GitHub repos with SKILL.md (minimum 2 stars to surface in search).
- **[LobeHub Skills Marketplace](https://lobehub.com/skills)** — Submit via the LobeHub UI with your GitHub URL.
- **[anthropics/skills](https://github.com/anthropics/skills)** — Anthropic's official public repository for community skills. Submit via PR per their contributing guidelines.

No formal "submission" workflow is needed for skills.sh or skillsmp.com — pushing this repo public is the action. To improve search ranking, keep the SKILL.md `description` field specific about WHEN to trigger (current frontmatter is tuned for this), tag GitHub releases, and add `topics` on the GitHub repo (`agent-skills`, `claude-code`, `e2e-testing`, `qa`, `playwright-alternative`, `chrome-devtools-mcp`).

## Topics / keywords

`agent-skills` `claude-code` `claude-skills` `cursor` `codex` `e2e-testing` `qa` `regression-testing` `chrome-devtools-mcp` `playwright-alternative` `user-journey-tests` `accessibility-testing` `canvas-testing` `svg-testing`

## License

MIT. See [LICENSE](./LICENSE).
