drop policy if exists "Public can manage products" on products;
drop policy if exists "Authenticated users can manage products" on products;

create policy "Auth users can manage products"
  on products for all to authenticated using (true) with check (true);
