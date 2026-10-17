-- Use with NEXT_PUBLIC_SUPABASE_TABLE_PREFIX=dermoscan_.
-- Keep pre-existing applications' public.profiles and auth triggers untouched.
create table if not exists public.dermoscan_profiles (
  id uuid references auth.users on delete cascade primary key,
  skin_type smallint check (skin_type between 1 and 6),
  age_range text check (age_range in ('under-18','18-29','30-44','45-59','60+')),
  activity_level text check (activity_level in ('low','moderate','high')),
  sunburn_history text check (sunburn_history in ('rarely','sometimes','frequently')),
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now()
);

create table if not exists public.dermoscan_scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  mole_label text not null,
  malignant_probability real not null,
  benign_probability real not null,
  predicted_class text not null,
  report_id text not null,
  scanned_at timestamptz default now() not null,
  image_preview text,
  image_quality_score smallint check (image_quality_score between 0 and 100),
  body_location text,
  symptoms text
);

alter table public.dermoscan_profiles enable row level security;
alter table public.dermoscan_scans enable row level security;

revoke all on table public.dermoscan_profiles, public.dermoscan_scans from anon;
grant select, insert, update on table public.dermoscan_profiles to authenticated;
grant select, insert, delete on table public.dermoscan_scans to authenticated;

create policy "DermoScan profile owner read" on public.dermoscan_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "DermoScan profile owner insert" on public.dermoscan_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "DermoScan profile owner update" on public.dermoscan_profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "DermoScan scan owner read" on public.dermoscan_scans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "DermoScan scan owner insert" on public.dermoscan_scans
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "DermoScan scan owner delete" on public.dermoscan_scans
  for delete to authenticated using ((select auth.uid()) = user_id);

create index dermoscan_scans_user_id_idx on public.dermoscan_scans (user_id);
create index dermoscan_scans_mole_label_idx on public.dermoscan_scans (user_id, mole_label);

comment on table public.dermoscan_profiles is 'Private DermoScan onboarding profiles, separate from older applications.';
comment on table public.dermoscan_scans is 'Private DermoScan research-model capture history.';
