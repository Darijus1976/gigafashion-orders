-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ORDERS
create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  client_name text not null,
  phone text not null,
  visit_date timestamptz not null,
  occasion text not null,
  occasion_custom text,
  event_date date,
  dress_type text not null check (dress_type in ('catalogue','custom')),
  status text not null default 'new'
    check (status in ('new','in_progress','fitted','completed','collected')),
  staff_member text not null,
  total_amount numeric(10,2) not null default 0,
  total_paid numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ORDER ITEMS
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  item_type text not null check (item_type in ('dress','alteration','extra','fitting','custom')),
  description text not null,
  price numeric(10,2) not null default 0,
  product_id uuid,
  sort_order int not null default 0
);

-- PRODUCTS (Catalogue)
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  catalogue text not null,
  extras_type text,
  price numeric(10,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  display_order int not null default 0,
  occasion_tags text[]
);

-- PAYMENTS
create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null check (method in ('cash','card','payment_link')),
  payment_date date not null default current_date,
  notes text
);

-- ORDER PHOTOS
create table order_photos (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  section text not null check (section in ('custom_dress','fitting')),
  storage_path text not null,
  is_annotated boolean not null default false,
  uploaded_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();
