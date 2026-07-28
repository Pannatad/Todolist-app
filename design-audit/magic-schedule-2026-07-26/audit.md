# Magic Schedule completeness audit

## Scope

- Surface: Magic Schedule, visual templates, conflict review, inspector, and schedule assistant.
- Viewports: desktop 1440 × 1000 and mobile 390 × 844.
- Themes: dark and light.
- Data mode: guest mode in the live browser; signed-in behavior was reviewed from the persistence code and migration.
- Validation: 52 tests, ESLint, and `git diff --check` pass.

## Flow steps

1. Desktop week canvas — generally healthy.
   - The canvas, visual template gallery, flexible shell, nested event, inspector, drag, resize, and event colors render.
   - Seven columns become narrow beside the inspector, and event text is small.
   - Evidence: `01-desktop-canvas.png`.

2. New visual template — partially complete.
   - It is one sheet with one Save action and includes Use current day and Ask AI shortcuts.
   - The promised click/drag timeline editor is not present; creation is still field-and-button based.
   - Invalid or overlapping nested activities are silently removed by sanitization rather than explained inline.
   - Evidence: `02-template-editor.png`.

3. Template conflict review — partially complete with correctness risks.
   - Keep, Replace, auto-fit, and custom merge options are visible before mutation.
   - Conflict rows omit the proposed start/end time, so the user cannot fully judge the overlap.
   - Replace can delete a flexible shell without deleting its children, leaving detached activities behind.
   - Auto-fit performs one shift pass and does not re-check the fitted result for new conflicts.
   - Evidence: `03-conflict-review.png`.

4. Mobile day canvas — needs a fix.
   - Single-day layout and weekday picker render.
   - The fixed Ask schedule assistant CTA sits underneath the mobile tab bar and is not visibly available.
   - The selected date has a second hidden, focusable day-heading button.
   - Evidence: `04-mobile-canvas.png`.

5. Mobile assistant sheet — blocked by overlapping global UI.
   - The focused assistant and composer render.
   - The global Open agent bubble overlaps the schedule assistant Send button.
   - Evidence: `05-mobile-assistant.png`.

6. Light theme — healthy.
   - Canvas, template cards, inspector, borders, and event colors remain legible.
   - Evidence: `06-light-theme.png`.

## Must-fix correctness issues

1. Signed-in template applications generate prefixed application IDs such as `application-<uuid>`, while Supabase declares `template_application_id` as `uuid`. Guest application works, but cloud insertion will reject the prefixed value.
2. The edit sheet passes `{ occurrenceDate }` when deleting one recurring occurrence, but Magic Schedule ignores that argument and deletes the complete series.
3. Replacing conflicts across multiple dates of the same recurring series can overwrite earlier recurrence exceptions because each deletion reads the same render-time schedule snapshot.
4. Replacing a conflicting flexible shell does not include its nested children in the replacement batch.
5. Auto-fit can move a proposal into a new conflict because it does not rerun conflict detection.
6. Rollback is best effort: rollback failures are logged and swallowed, so the UI promise that no partial changes remain is stronger than the implementation.

## Important incomplete plan items

1. Template creation is not a direct manipulation timeline.
2. The schedule assistant claims it can read habits, projects, and preferences, but only tasks, schedules, and templates are supplied to this channel.
3. Recurring parent-shell reminders are not expanded into occurrences; notification checks use the original stored start time.
4. Custom merge only pre-fills the assistant input. The user must manually send it and then confirm again.
5. Future-template update review shows counts rather than the promised block-by-block diff.
6. Manual template delete and duplicate controls are absent; the ellipsis on the template card is decorative.

## Useful next upgrades

1. Show the final fitted timeline before confirming auto-fit or custom merge.
2. Add current-time line and auto-scroll to the current hour or selected block.
3. Lay independent overlapping events into side-by-side lanes instead of stacking them.
4. Show activity names in template previews, especially on touch devices where hover titles are unavailable.

## Evidence limits

- Signed-in CRUD was not exercised against a live Supabase account in this audit.
- Screenshot review can identify visible accessibility risks but does not prove screen-reader or full keyboard compliance.
- Voice, camera/image parsing, notification permission prompts, and failed-network rollback were not triggered.
