alter table products
  add column if not exists description text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Public can upload product images" on storage.objects;
drop policy if exists "Public can update product images" on storage.objects;
drop policy if exists "Public can delete product images" on storage.objects;

create policy "Public can view product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "Public can upload product images"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'product-images');

create policy "Public can update product images"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

create policy "Public can delete product images"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'product-images');
