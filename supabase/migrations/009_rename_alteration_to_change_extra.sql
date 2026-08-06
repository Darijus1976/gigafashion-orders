-- Rename item_type value 'alteration' -> 'change_extra' (Section 3: "Changes/Extras")
alter table order_items drop constraint if exists order_items_item_type_check;

update order_items set item_type = 'change_extra' where item_type = 'alteration';

alter table order_items
  add constraint order_items_item_type_check
  check (item_type in ('dress','change_extra','extra','fitting','custom'));
