alter table public.order_items
  add column if not exists image_url text;
