-- Run this after 001_initial_schema.sql to seed the CPALE exam template.
-- In Supabase Dashboard: SQL Editor → paste and run.

insert into public.exam_templates (name, slug, config)
values (
  'CPALE (Certified Public Accountant Licensure Exam)',
  'cpale',
  (select pg_read_file('seed/cpale-template.json')::jsonb)
)
on conflict (slug) do nothing;
