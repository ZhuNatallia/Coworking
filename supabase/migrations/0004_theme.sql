-- Each person's chosen appearance. Light is explicit, so a phone in dark mode does not recolour the app.
alter table public.profiles
  add column theme text not null default 'light' check (theme in ('light', 'dark'));
