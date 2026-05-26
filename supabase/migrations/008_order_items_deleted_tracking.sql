alter table public.order_items
  add column if not exists deleted boolean not null default false;

alter table public.order_items
  add column if not exists deleted_at timestamptz;

alter table public.order_items
  add column if not exists deleted_by text;
