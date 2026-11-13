create table if not exists public.prixburg_data (
    key text primary key,
    value jsonb not null default 'null'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.prixburg_data enable row level security;

drop policy if exists "prixburg_data_read" on public.prixburg_data;
drop policy if exists "prixburg_data_write" on public.prixburg_data;
drop policy if exists "prixburg_data_all" on public.prixburg_data;

create policy "prixburg_data_all"
    on public.prixburg_data
    for all
    to anon, authenticated
    using (true)
    with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.prixburg_data to anon, authenticated;

notify pgrst, 'reload schema';
