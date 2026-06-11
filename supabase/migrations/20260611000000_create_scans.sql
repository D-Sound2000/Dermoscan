create table if not exists public.scans (
  id                    uuid        default gen_random_uuid() primary key,
  user_id               uuid        references auth.users on delete cascade not null,
  mole_label            text        not null,
  malignant_probability real        not null,
  benign_probability    real        not null,
  predicted_class       text        not null,
  report_id             text        not null,
  scanned_at            timestamptz default now() not null
);

alter table public.scans enable row level security;

create policy "Users can view their own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own scans"
  on public.scans for delete
  using (auth.uid() = user_id);

create index scans_user_id_idx on public.scans (user_id);
create index scans_mole_label_idx on public.scans (user_id, mole_label);
