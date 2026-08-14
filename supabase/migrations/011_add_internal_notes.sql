alter table orders
  add column if not exists internal_notes text,
  add column if not exists internal_photo_urls text[] not null default '{}';
