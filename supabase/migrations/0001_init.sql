-- OfficeCare: initial schema.
-- The Next.js server talks to the database with the service_role key and enforces roles itself.
-- Row level security below is a second line of defence for anyone using the public anon key.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  avatar text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null,
  address text not null default '',
  contact_name text,
  contact_phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city_id, name)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  time text check (time ~ '^\d{2}:\d{2}$'),
  recurrence text not null default 'weekly' check (recurrence in ('weekly', 'pair', 'alternate')),
  employee_1_id uuid not null references public.profiles (id),
  employee_2_id uuid references public.profiles (id),
  starts_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (recurrence = 'weekly' or employee_2_id is not null)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  schedule_id uuid references public.schedules (id) on delete set null,
  origin_date date,
  scheduled_date date not null,
  time text check (time ~ '^\d{2}:\d{2}$'),
  employee_1_id uuid references public.profiles (id),
  employee_2_id uuid references public.profiles (id),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'skipped')),
  is_override boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  unique (schedule_id, origin_date)
);
create index visits_date_idx on public.visits (scheduled_date);
create index visits_office_date_idx on public.visits (office_id, scheduled_date);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  name text not null,
  done_label text,
  category text not null check (category in ('cleaning', 'kitchen', 'bathroom', 'office', 'extra')),
  frequency text not null default 'weekly' check (frequency in ('weekly', 'monthly', 'as_needed')),
  required boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.visit_tasks (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'not_needed', 'needed', 'done', 'skipped')),
  notes text,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  unique (visit_id, task_id)
);

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null check (unit in ('pcs', 'pack', 'roll', 'bottle', 'ream', 'kg', 'l')),
  category text not null default 'kitchen' check (category in ('kitchen', 'bathroom', 'office', 'cleaning')),
  active boolean not null default true,
  sort_order integer not null default 0
);

-- Current state of a supply in an office.
create table public.office_supplies (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete cascade,
  quantity numeric,
  status text check (status in ('ok', 'low', 'out')),
  low_threshold numeric,
  critical_threshold numeric,
  sort_order integer not null default 0,
  updated_at timestamptz,
  updated_by uuid references public.profiles (id),
  unique (office_id, supply_id)
);

-- Snapshot of a supply as recorded during one visit. Never rewritten by later visits.
create table public.visit_supplies (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete cascade,
  quantity numeric,
  status text check (status in ('ok', 'low', 'out')),
  notes text,
  updated_at timestamptz,
  unique (visit_id, supply_id)
);

create table public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete cascade,
  quantity numeric,
  reason text not null check (reason in ('low', 'out')),
  status text not null default 'open' check (status in ('open', 'delivered', 'cancelled')),
  created_from_visit_id uuid references public.visits (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id)
);
-- At most one active "take with you" item per office and supply.
create unique index supply_requests_one_open on public.supply_requests (office_id, supply_id) where status = 'open';

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create table public.app_settings (
  id text primary key,
  value text not null
);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.my_office_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select office_id from public.schedules where active and auth.uid() in (employee_1_id, employee_2_id)
  union
  select office_id from public.visits where auth.uid() in (employee_1_id, employee_2_id);
$$;

create or replace function public.is_my_visit(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.visits where id = v and auth.uid() in (employee_1_id, employee_2_id));
$$;

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.offices enable row level security;
alter table public.schedules enable row level security;
alter table public.visits enable row level security;
alter table public.tasks enable row level security;
alter table public.visit_tasks enable row level security;
alter table public.supplies enable row level security;
alter table public.office_supplies enable row level security;
alter table public.visit_supplies enable row level security;
alter table public.supply_requests enable row level security;
alter table public.photos enable row level security;
alter table public.app_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'cities', 'offices', 'schedules', 'visits', 'tasks', 'visit_tasks',
    'supplies', 'office_supplies', 'visit_supplies', 'supply_requests', 'photos', 'app_settings'
  ] loop
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

create policy read_colleagues on public.profiles for select to authenticated using (active or id = auth.uid());
create policy read_cities on public.cities for select to authenticated using (true);
create policy read_supplies on public.supplies for select to authenticated using (true);

create policy read_my_offices on public.offices for select to authenticated
  using (id in (select public.my_office_ids()));
create policy read_my_schedules on public.schedules for select to authenticated
  using (office_id in (select public.my_office_ids()));
create policy read_my_tasks on public.tasks for select to authenticated
  using (office_id in (select public.my_office_ids()));

create policy read_my_office_supplies on public.office_supplies for select to authenticated
  using (office_id in (select public.my_office_ids()));
create policy update_my_office_supplies on public.office_supplies for update to authenticated
  using (office_id in (select public.my_office_ids()))
  with check (office_id in (select public.my_office_ids()));

create policy read_my_visits on public.visits for select to authenticated
  using (auth.uid() in (employee_1_id, employee_2_id));
create policy update_my_visits on public.visits for update to authenticated
  using (auth.uid() in (employee_1_id, employee_2_id))
  with check (auth.uid() in (employee_1_id, employee_2_id));

create policy my_visit_tasks on public.visit_tasks for all to authenticated
  using (public.is_my_visit(visit_id)) with check (public.is_my_visit(visit_id));
create policy my_visit_supplies on public.visit_supplies for all to authenticated
  using (public.is_my_visit(visit_id)) with check (public.is_my_visit(visit_id));
create policy my_photos on public.photos for all to authenticated
  using (public.is_my_visit(visit_id)) with check (public.is_my_visit(visit_id));

create policy read_my_requests on public.supply_requests for select to authenticated
  using (office_id in (select public.my_office_ids()));
create policy insert_my_requests on public.supply_requests for insert to authenticated
  with check (office_id in (select public.my_office_ids()));
create policy update_my_requests on public.supply_requests for update to authenticated
  using (office_id in (select public.my_office_ids()))
  with check (office_id in (select public.my_office_ids()));

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
