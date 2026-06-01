# Example: Narrative-to-Steps Conversion

This file shows what a finished story looks like, end to end, so the format and level of detail are concrete. The example is a fictional mobile habit tracker called **HabitFlow** (iOS + Android), a small but realistic app. Use it as a model for shape, length, and tone — not as a template to copy literally.

The key thing this example demonstrates is **intent-based steps**. Every step describes *what the user is trying to accomplish* and *what should observably change in the product*, never *which button to tap* or *what dialog to expect*. UI evolves; the test plan stays valid.

---

## What the test plan looks like

Below is the full output for HabitFlow — two stories, where Story 2 chains from Story 1's end state to avoid restaging. Notice:

- Story 1 is **one continuous session** from app open to close, covering ~16 features
- Story 2 starts from Story 1's end state and covers features Story 1 couldn't naturally fit
- Side paths appear inline, only where a real user would hit them
- Platform-aware moments (permissions, push, backgrounding) appear where they fit the journey
- Each step pairs a **product-level intent** with an **observable outcome** — no UI mechanics

---

# E2E Test Plan — HabitFlow

**Scope:** Whole app, mobile
**Platforms:** iOS 17+, Android 13+
**Prerequisites:**
- Test account(s): a fresh email the tester can receive mail at
- Test data: none required (the journey creates everything it needs)
- Environment: staging
- Build: HabitFlow v2.4.0 (build 248)

## How to use this plan
Each story is a complete user session — run the steps top-to-bottom from a clean start. Stories chain where their preconditions say so. The tester (human or agent) navigates by product-domain reasoning, not by literal label-matching: each step says what the user wants done; the tester finds whichever surface in the current UI satisfies the intent.

**Fix-and-resume-then-confirm protocol:** when a step's intent can't be accomplished, stop, fix the system, then **resume from the broken step** (the prior steps' state is still good — don't recreate it). Continue fixing and resuming through the rest of the story. Once the story reaches its final step, run it once more end-to-end from step 1 with no fixes allowed — that confirmation pass is the actual deliverable. Cosmetic divergences (label wording, dialog vs page, etc.) are not failures; the intent is what matters.

**Concrete expected outcomes:** any step that produces a measurable result — a number, a count, a status — states the expected value (or range) so the tester can distinguish *correct* from *coincidentally non-empty*. Vague liveness checks like "produces a value" hide calculation bugs.

---

## Story 1: New user sets up three habits and uses them through the first day

**Persona:** Alex, a new user who downloaded HabitFlow on Sunday evening, planning to start three habits starting Monday: a morning workout, daily reading, and tracking water intake. By Monday evening Alex wants to feel like the app actually works — that reminders fired, check-ins were easy, and progress is visible.

**Preconditions:**
- Fresh install of HabitFlow on a real device (not simulator)
- No existing HabitFlow account on this device
- Device system notifications are enabled at the OS level
- Test email account accessible
- Device clock can be advanced (for the "Monday morning" portion)

### Narrative

It's Sunday evening. Alex opens HabitFlow for the first time and walks through onboarding: account creation, a short intro, and a notifications permission prompt (Alex grants it — the whole point is to get reminded). Alex creates three habits: a morning workout at 7 AM weekdays, reading for 30 minutes any time daily, and water intake with a target of 8 cups per day. While setting the workout reminder time, Alex accidentally picks the wrong time, notices, and corrects it. Alex spends a moment customizing the app to dark mode.

Sunday turns to Monday morning. The device clock advances. A push notification arrives for the workout habit; Alex taps it and lands directly on the workout check-in. Alex marks it complete. Throughout the simulated day, Alex opens the app a few times to log water, over-counts at one point and uses undo to correct. In the evening, Alex marks reading complete with a short reflection note.

Before bed Alex checks the day's stats and streaks, briefly considers sharing the workout streak but cancels because it's just day 1, backgrounds the app, returns to find state preserved, and force-quits before sleep. On reopening the next morning Alex sees streaks preserved and yesterday's check-ins still reflected.

### Steps

- [ ] 1. Sign up for a new HabitFlow account with the test email and a valid password → Expected: Account is created, the user is signed in, and onboarding for first-time users begins
   - **Side path — weak password:** if a too-short password is entered, the app refuses it with feedback and lets the user retry. Return to step 1's main outcome after a valid password.
- [ ] 2. Complete the intro / welcome flow → Expected: Intro ends, the system asks for permission to send notifications
- [ ] 3. Grant notifications permission → Expected: Permission is recorded; the app now allows scheduled reminders
- [ ] 4. Create the first habit "Morning Workout" with weekday frequency and a 7:00 PM reminder (intentional mistake) → Expected: A new habit exists in Alex's account with those settings, visible on Alex's habit list
- [ ] 5. Correct the workout reminder to 7:00 AM → Expected: The habit's reminder time is now 7:00 AM weekdays; the change persists across navigation
- [ ] 6. Create a second habit "Daily Reading", every day, no reminder, no target → Expected: A second habit appears in the list with those settings
- [ ] 7. Create a third habit "Water" with a daily target of 8 counts → Expected: A third habit appears with a counter UI showing 0 progress against the 8-count target
- [ ] 8. Switch the app to dark mode → Expected: The visual theme changes and the preference is remembered across navigation
- [ ] 9. Advance the device clock to Monday 7:00 AM (or trigger the workout reminder for testing) → Expected: A push notification for the Morning Workout fires within ~30 seconds of the scheduled time
- [ ] 10. Tap the push notification → Expected: The app launches directly into Alex's Morning Workout check-in context — not the generic home view
- [ ] 11. Mark the workout complete for today → Expected: The habit shows as completed for today on Alex's habit list and in any per-habit detail view; appropriate feedback (animation/haptic) fires
- [ ] 12. Increment the Water counter past today's target (e.g., 9 increments) → Expected: The counter exceeds 8 and the UI acknowledges the over-target state without erroring
- [ ] 13. Undo the last water increment → Expected: The counter returns to exactly the target (8 of 8) with a clear "target reached" indicator
- [ ] 14. Background the app, wait several seconds, return to it → Expected: The app resumes on the same context with state preserved
- [ ] 15. Mark Daily Reading complete and add a short reflection note ("Finished chapter 3") → Expected: Reading is recorded as complete for today; the reflection note is saved and visible on subsequent visits to that habit
   - **Side path — keyboard hides the save control:** if the on-screen keyboard obscures the save affordance, dismissing it (scroll / tap outside) restores access. Resume the main flow.
- [ ] 16. View today's stats → Expected: All three habits are shown as completed for today; the daily completion summary reflects 100%
- [ ] 17. View streaks → Expected: Each habit shows a 1-day active streak
- [ ] 18. Begin sharing the Morning Workout streak, then cancel before posting → Expected: The native share surface opens with appropriate content, and cancelling returns Alex to where they were with no state changes
- [ ] 19. Force-quit the app, then relaunch it → Expected: The app reopens directly into the signed-in experience (no re-login needed); all three habits, today's completions, and the streak counts are intact
- [ ] 20. Pull / trigger a manual refresh on the habit list → Expected: A refresh runs without error and the displayed state is unchanged (nothing changed server-side)

**End state:** Alex's account is signed in on the device; 3 habits exist (Morning Workout 7 AM weekdays / Daily Reading every day / Water target 8 every day); each has one completed check-in for "today" with a reflection note on Daily Reading; dark mode is on; session persists. Story 2 starts from this state.

**(End of Story 1)**

---

## Story 2: Returning user — day 5 — adjusts habits and checks weekly stats

**Persona:** Alex returns to HabitFlow four days after the first session. The week didn't go perfectly — reading hasn't stuck and the water target feels too ambitious on busy days. Alex wants to take stock, drop one habit, adjust another, start a fresh streak today, and then hand the phone to a family member.

**Preconditions:** Continues from Story 1's end state.

### Narrative

The tester advances the device clock to simulate the gap. Alex opens HabitFlow expecting some progress, but no check-ins happened on days 2–4 in this test scenario so the streaks have reset. Alex looks at the weekly stats grid to see the gap concretely, then makes two corrections: deletes Daily Reading entirely and lowers the Water target. Alex does today's water and morning workout to begin a new streak, then signs out before handing the phone over.

### Steps

- [ ] 1. Advance the device clock by 4 days; reopen the app → Expected: The app resumes signed-in; the 3 habits and dark-mode preference are intact; today shows no check-ins yet
- [ ] 2. View the streak status for each habit → Expected: Each habit reflects that its active streak has been broken (no longer counts toward an active run), though the day-1 completion history from Story 1 is preserved as historical fact
- [ ] 3. View the weekly stats → Expected: The 7-day breakdown clearly shows Story 1's check-in day as complete for all 3 habits and the intervening days as empty
- [ ] 4. Delete the Daily Reading habit (with confirmation) → Expected: Daily Reading is gone from the habit list; the list now contains 2 habits; the deletion is final unless an undo affordance is offered
- [ ] 5. Reduce the Water habit's daily target from 8 to 6 → Expected: The habit's target is now 6; today's counter reflects the new target (0 of 6)
- [ ] 6. Complete today's Water target by incrementing 6 times → Expected: Counter shows 6 of 6 with the "target reached" indicator
- [ ] 7. Mark Morning Workout complete for today → Expected: Workout is marked complete for today
- [ ] 8. View streaks → Expected: Both remaining habits show a fresh 1-day active streak (the streak restarted today)
- [ ] 9. Sign out of the account → Expected: The session ends; reopening the app brings Alex back to the signed-out entry experience

**(End of Story 2 — end of plan)**

---

## Notes on what this example demonstrates

- **One long primary session, many features:** Story 1 covers signup, intro, permissions, habit creation with all field types, edit, dark mode, push notifications, deep-link from push, counter habit interaction, undo, reflection notes, daily stats, streaks, native share, backgrounding/foregrounding, force-quit persistence, pull-to-refresh. ~16 features in one narrative.
- **Intent-based steps:** every step describes *what* the user wants accomplished and *what change should result*, not *how to operate the UI*. A step like "Create a habit named X with weekly frequency and a 7 AM reminder" is stable across redesigns; "Tap +, then tap the Frequency dropdown, then…" breaks the moment the UI ships a typeahead instead.
- **Allowed specificity:** habit names, frequency choices, target values, the order of beats, time advances, file paths, account credentials. None of those depend on UI shape.
- **Forbidden specificity:** specific button labels, dialog vs page, sidebar locations, exact toast copy, widget kinds, URL paths. The example earlier in this skill's history was full of those — the rewrite stripped them out, and the plan is now stable across UI evolution.
- **Chained second story:** Story 2 picks up from Story 1's end state rather than recreating the account, habits, and history.
- **Side paths are inline and minimal:** weak-password retry at Story 1 step 1, keyboard-covering-save at Story 1 step 15. Both fit naturally; neither was invented for coverage.
- **Platform-aware moments woven in:** notification permission, push deep-link, backgrounding, force-quit, pull-to-refresh — each fits the journey, not appended as a checklist.
- **Expected outcomes are observable but abstract:** "the habit shows as completed for today" doesn't pin a checkmark icon or row position. The tester finds whatever indicator the app uses to communicate "completed today."

Use this shape, density, and intent-discipline when generating new test plans.
