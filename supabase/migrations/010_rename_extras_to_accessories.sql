-- Rename item_type value 'extra' -> 'accessory' (Section 4: "Accessories")
alter table order_items drop constraint if exists order_items_item_type_check;

update order_items set item_type = 'accessory' where item_type = 'extra';

alter table order_items
  add constraint order_items_item_type_check
  check (item_type in ('dress','change_extra','accessory','fitting','custom'));

-- Rename products catalogue value 'extras' -> 'accessories'
update products set catalogue = 'accessories' where catalogue = 'extras';

-- Rename products.extras_type column to accessory_type
alter table products rename column extras_type to accessory_type;
