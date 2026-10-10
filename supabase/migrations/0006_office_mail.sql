-- Letters recorded at a coworking: who they are for, and what to do with them.
create table public.office_mail (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  recipient text not null check (char_length(btrim(recipient)) > 0),
  instruction text not null check (char_length(btrim(instruction)) > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.office_mail enable row level security;

create policy admin_office_mail on public.office_mail for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy read_office_mail on public.office_mail for select to authenticated
  using (office_id in (select public.my_office_ids()));
create policy insert_office_mail on public.office_mail for insert to authenticated
  with check (office_id in (select public.my_office_ids()));
create policy delete_office_mail on public.office_mail for delete to authenticated
  using (office_id in (select public.my_office_ids()));
