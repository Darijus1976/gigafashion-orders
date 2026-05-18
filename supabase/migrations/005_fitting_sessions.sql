create table if not exists fitting_sessions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  session_key text not null,
  fitting_date date not null,
  notes jsonb not null default '[]'::jsonb,
  photo_urls text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fitting_sessions_order_session_key_idx
  on fitting_sessions(order_id, session_key);

alter table fitting_sessions enable row level security;

create policy "Public can create fitting sessions"
  on fitting_sessions for insert to anon with check (true);

create policy "Public can update fitting sessions"
  on fitting_sessions for update to anon using (true) with check (true);

create policy "Auth users can view all fitting sessions"
  on fitting_sessions for select to authenticated using (true);

create trigger fitting_sessions_updated_at
  before update on fitting_sessions
  for each row execute function update_updated_at();
