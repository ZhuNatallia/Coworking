-- OfficeCare: per-user app language and a cache of machine translations.

alter table public.profiles
  add column locale text not null default 'ru' check (locale in ('ru', 'en', 'de', 'ro'));

-- id = sha1(lang || ':' || source), computed by the app.
create table public.translations (
  id text primary key,
  lang text not null check (lang in ('ru', 'en', 'de', 'ro')),
  source text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.translations enable row level security;

create policy admin_all on public.translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy read_translations on public.translations for select to authenticated using (true);
