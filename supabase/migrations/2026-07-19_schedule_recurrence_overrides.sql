-- Per-day / per-weekday customization of recurring schedule items.
-- Keys are either an exact local date ("2026-07-20") or a weekday ("weekday-0".."weekday-6", Sun..Sat).
-- Values are partial overrides: { "title", "category", "color", "notes", "duration", "startTime" ("HH:MM") }.
-- A date key wins over a weekday key for the same occurrence.
alter table public.schedule_items
    add column if not exists recurrence_overrides jsonb not null default '{}'::jsonb;
