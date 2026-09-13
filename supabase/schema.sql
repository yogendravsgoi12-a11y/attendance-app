-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create extension if not exists "pgcrypto";

-- One row per registered student, including their face "fingerprint"
-- (a list of 128 numbers produced by face-api.js).
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique not null,
  full_name text not null,
  photo_url text,
  face_descriptor float8[] not null,
  created_at timestamptz default now()
);

-- One row per student per day a classroom photo was scanned.
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) not null,
  attendance_date date not null,
  status text not null default 'present', -- 'present' or 'absent'
  confidence float8,
  created_at timestamptz default now(),
  unique (student_id, attendance_date)
);

-- Storage buckets for the two kinds of photos we save.
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('classroom-photos', 'classroom-photos', true)
on conflict (id) do nothing;

-- Phase 1 has no login yet, so we allow the app's public key to read/write.
-- Before you add real users, replace these with per-role policies.
alter table students enable row level security;
alter table attendance enable row level security;

create policy "allow all on students" on students
  for all using (true) with check (true);

create policy "allow all on attendance" on attendance
  for all using (true) with check (true);

create policy "public read student photos" on storage.objects
  for select using (bucket_id = 'student-photos');
create policy "public upload student photos" on storage.objects
  for insert with check (bucket_id = 'student-photos');

create policy "public read classroom photos" on storage.objects
  for select using (bucket_id = 'classroom-photos');
create policy "public upload classroom photos" on storage.objects
  for insert with check (bucket_id = 'classroom-photos');
