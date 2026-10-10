-- Each coworking can be marked with a colour (key from OFFICE_COLORS in src/lib/office-colors.ts).
alter table public.offices add column color text;
