-- Magic Schedule V2 keeps existing rows compatible while adding explicit
-- template provenance and parent/child schedule relationships.
alter table public.schedule_templates
    add column if not exists schema_version integer not null default 1,
    add column if not exists version integer not null default 1;

alter table public.schedule_items
    add column if not exists item_kind text not null default 'event',
    -- schedule_items.id is a bigint identity in the deployed database, so the
    -- self-reference must use bigint as well.
    add column if not exists parent_item_id bigint,
    add column if not exists source_template_id uuid references public.schedule_templates(id) on delete set null,
    add column if not exists source_template_version integer,
    add column if not exists template_block_id text,
    add column if not exists template_application_id uuid;

alter table public.schedule_items
    drop constraint if exists schedule_items_parent_item_id_fkey;

alter table public.schedule_items
    add constraint schedule_items_parent_item_id_fkey
    foreign key (parent_item_id)
    references public.schedule_items(id)
    on delete set null;

alter table public.schedule_items
    drop constraint if exists schedule_items_item_kind_check;

alter table public.schedule_items
    add constraint schedule_items_item_kind_check
    check (item_kind in ('event', 'flexible_shell'));

create index if not exists idx_schedule_items_parent_item_id
    on public.schedule_items(parent_item_id);

create index if not exists idx_schedule_items_template_application_id
    on public.schedule_items(template_application_id);

create index if not exists idx_schedule_items_source_template_id
    on public.schedule_items(source_template_id);
