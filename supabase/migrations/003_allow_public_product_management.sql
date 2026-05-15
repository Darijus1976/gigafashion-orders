drop policy if exists "Auth users can manage products" on products;

create policy "Public can manage products"
  on products for all to anon using (true) with check (true);

create policy "Authenticated users can manage products"
  on products for all to authenticated using (true) with check (true);
