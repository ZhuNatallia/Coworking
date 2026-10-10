-- A shared mark on one calendar day. Weekly cleaning stays on the schedule;
-- this is only for days someone explicitly marks as planned or done.
create table public.day_marks (
  id date primary key,
  status text not null check (status in ('planned', 'done')),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.day_marks enable row level security;

create policy read_day_marks on public.day_marks for select to authenticated using (true);
create policy write_day_marks on public.day_marks for all to authenticated using (true) with check (true);
