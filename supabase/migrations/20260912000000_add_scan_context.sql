alter table public.scans
  add column if not exists image_preview text,
  add column if not exists image_quality_score smallint check (image_quality_score between 0 and 100),
  add column if not exists body_location text,
  add column if not exists symptoms text;

comment on column public.scans.image_preview is
  'Optional compressed preview used for private longitudinal comparison. Never used to train the model.';

