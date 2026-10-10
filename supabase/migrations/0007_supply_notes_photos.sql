-- A short note on an office material ("what's left or broken") and photos of that row.
-- Older photos stay attached to a visit. A photo belongs to exactly one of the two.

alter table public.office_supplies add column note text;
alter table public.supply_requests add column note text;

alter table public.photos alter column visit_id drop not null;
alter table public.photos
  add column office_supply_id uuid references public.office_supplies (id) on delete cascade;

alter table public.photos add constraint photos_one_owner check (
  (visit_id is not null and office_supply_id is null)
  or (visit_id is null and office_supply_id is not null)
);

drop policy my_photos on public.photos;
create policy my_photos on public.photos for all to authenticated
  using (
    (visit_id is not null and public.is_my_visit(visit_id))
    or (
      office_supply_id is not null
      and exists (
        select 1 from public.office_supplies s
        where s.id = office_supply_id and s.office_id in (select public.my_office_ids())
      )
    )
  )
  with check (
    (visit_id is not null and public.is_my_visit(visit_id))
    or (
      office_supply_id is not null
      and exists (
        select 1 from public.office_supplies s
        where s.id = office_supply_id and s.office_id in (select public.my_office_ids())
      )
    )
  );
