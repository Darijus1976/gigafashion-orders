-- RLS Policies for Giga Fashion

-- Enable RLS on all tables
alter table orders enable row level security;
alter table order_items enable row level security;
alter table products enable row level security;
alter table payments enable row level security;
alter table order_photos enable row level security;

-- Orders: anyone can insert (public form)
create policy "Public can create orders"
  on orders for insert to anon with check (true);

-- Orders: only auth users can select all
create policy "Auth users can view all orders"
  on orders for select to authenticated using (true);

-- Orders: anyone can view order by order_number
create policy "Anyone can view order by order_number"
  on orders for select to anon
  using (order_number = current_setting('app.current_order_number', true));

-- Order items: follow parent order policies
create policy "Public can create order items"
  on order_items for insert to anon with check (true);

create policy "Auth users can view all order items"
  on order_items for select to authenticated using (true);

-- Products: public read (for order form catalogue), auth write (CMS)
create policy "Public can view active products"
  on products for select to anon using (is_active = true);

create policy "Auth users can manage products"
  on products for all to authenticated using (true);

-- Payments: follow parent order policies
create policy "Public can create payments"
  on payments for insert to anon with check (true);

create policy "Auth users can view all payments"
  on payments for select to authenticated using (true);

-- Order photos: follow parent order policies
create policy "Public can create order photos"
  on order_photos for insert to anon with check (true);

create policy "Auth users can view all order photos"
  on order_photos for select to authenticated using (true);
