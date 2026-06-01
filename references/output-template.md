# Output template

The skill produces this shape. Adapt the placeholders, but preserve the structure.

```markdown
# E2E Test Plan — [App or Feature Name]

**Scope:** [one-line scope statement]
**Platforms:** [iOS / Android / Web / etc.]
**Prerequisites:**
- Test account(s): [credentials]
- Test data: [what the tester needs in place — e.g., a sample CSV at path X]
- Environment: [staging / prod-like / etc.]
- Build: [version, branch, or build ID under test]

## How to use this plan

**The plan is a means, not an end. The point is a working system — the story tells what "working" looks like in the user's terms. Don't optimize for "I checked all the boxes"; optimize for "the story plays through and the system did what the persona needed."**

### The fix-and-resume-then-confirm protocol

Each story below is a complete user session. Run the steps top-to-bottom. The protocol when a step does NOT pass as specified:

1. **Stop driving.** Do not continue past a broken step "to gather more bugs" — that loses the signal of *which* failure cascaded into the rest.
2. **Diagnose in the codebase.** Trace the actual call path; find the root cause, not the symptom.
3. **Fix the system.** Change the product code (or build the missing feature) so the step would now pass. The plan is the spec; the shipped system catches up to the plan, not the other way around. Atomic commit explaining the *why*.
4. **Resume from the broken step**, NOT from step 1. The state built up by all prior passing steps is real and reusable; recreating it from scratch on every fix wastes time, tokens, and (for AI-driven tests) provider quota. If the fix invalidates earlier state (e.g., a schema migration), then yes, reset; otherwise, pick up where the failure happened.

   **A code-reload is NOT a state reset.** Restarting the dev server to pick up HMR-resistant code changes does NOT touch the state store. Firestore docs / Postgres rows / MongoDB collections all persist across the restart. Resume from the broken step exactly as if no restart had happened.
5. **Iterate** through the story this way — fix, resume, fix, resume — until the story reaches its final step.
6. **Then run the story once more from step 1, end-to-end, with no fixes allowed.** This confirmation pass is the actual deliverable. If any step fails during the confirmation pass, that's a real regression — fix it and restart the confirmation pass from step 1.

A story is finished when a real user could replay it end-to-end and accomplish the mission without the tester intervening. Until then, you're not done.

### What counts as a "bug" vs. a "note"

- **Bug** (forces fix + resume): the step's expected result is observably wrong, missing, or unreachable.
- **Note** (proceed, log alongside the step): cosmetic copy differences, semantically-equivalent UI variations.

When in doubt, treat it as a bug. False positives waste an iteration; false negatives ship a broken product.

### Side paths

Side paths (nested checkboxes) run as part of the surrounding step when their condition applies. They're part of the story, not separate tests.

---

## Story 1: [Short title — the user's situation in plain language]

**Persona:** [who this user is and why they're using the app right now]
**Preconditions:** [account state, test data, build under test — OR — "continues from Story N's end state: <brief recap>"]

### Narrative
[A few paragraphs telling the story in plain prose — what the user is trying to do, the full arc of their session, the side paths that come up naturally. This is what the tester reads to understand the journey before they start tapping.]

### Steps

- [ ] 1. [Intent — what the user is trying to do, in product terms]  →  Expected: [observable outcome at the product level]  `[snapshot: full]`
- [ ] 2. [Intent]  →  Expected: [observable outcome]  `[snapshot: diff]`
- [ ] 3. [Intent — opens a dialog, no navigation]  →  Expected: [observable outcome]  `[snapshot: diff]`
  - **Side path — [name]:** [when this branch applies]
    - [ ] 3a. [Intent]  →  Expected: [observable outcome]  `[snapshot: diff]`
    - [ ] 3b. Return to main flow at step 4
- [ ] 4. [Intent — navigates to a different page]  →  Expected: [observable outcome]  `[snapshot: full]`
…

**End state (only if a subsequent story depends on this):** [what's true now]

---

## Story 2 (only if needed): …
```

## Rules for the steps inside the template

- Each step = `[Intent] → Expected: [observable product-level outcome]`. Both halves matter. Intent without a verifiable outcome isn't testable.
- Steps describe **what** the user is trying to do and **what change should result**, never **how to operate the UI** (buttons, dialogs, URLs, widget kinds). UI evolves; intent doesn't.
- **Data-producing steps must specify a concrete expected value** (or tight range / tolerance). "Produces a non-zero λ" is insufficient; "produces a system λ of approximately X ± Y%" is required. Specify inputs concretely enough to forward-compute it.
- **Every UI-interaction step carries a snapshot hint** (`[snapshot: diff]` or `[snapshot: full]`) as a trailing backticked tag. Default `diff`; use `full` only when the step navigates or otherwise invalidates the prior tree.
- The **narrative** comes before the steps. It's the soul of the story; the steps are its checkpoint sequence.
- Side paths are nested checkboxes under the step they branch from, with a clear "return to main flow" instruction.
- Use level-2 headings (`##`) for stories so the document is navigable.
- Trust the tester to navigate by product-domain reasoning, not by label-matching.
- Include an **End state** block only when a later story chains from it.
