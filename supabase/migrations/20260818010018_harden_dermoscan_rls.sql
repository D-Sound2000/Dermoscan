-- Explicit Data API privileges are required for tables created after the
-- 2026 Supabase default-grant change. RLS below remains the authorization
-- boundary: authenticated users can only access their own rows.
revoke all on table public.profiles from anon;
revoke all on table public.scans from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, delete on table public.scans to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own scans" on public.scans;
drop policy if exists "Users can insert their own scans" on public.scans;
drop policy if exists "Users can delete their own scans" on public.scans;

create policy "Users can view their own scans"
  on public.scans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own scans"
  on public.scans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own scans"
  on public.scans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- The auth trigger still runs as its owner, but it is not a public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
