create table if not exists public.profiles (
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

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a blank profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
