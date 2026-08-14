alter table orders
  add column if not exists dress_colour text,
  add column if not exists dress_colour_other text;

alter table orders drop constraint if exists orders_dress_colour_check;

alter table orders
  add constraint orders_dress_colour_check
  check (dress_colour is null or dress_colour in ('white','off_white','ivory','other'));
