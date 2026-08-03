-- Run once in the Supabase SQL editor before deploying the filename persistence change.
alter table public.ai_settings
  add column if not exists active_filename text;
