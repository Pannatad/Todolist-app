-- How much a schedule block matters: 1 = optional, 2 = should do, 3 = must do.
-- Existing rows become 2, the default, so they keep their current look.
-- Per-day priority lives in recurrence_overrides alongside title, color, etc.
alter table public.schedule_items
    add column if not exists priority smallint not null default 2;

alter table public.schedule_items
    drop constraint if exists schedule_items_priority_check;

alter table public.schedule_items
    add constraint schedule_items_priority_check
    check (priority between 1 and 3);
