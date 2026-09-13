-- Run this once in the SQL Editor, on top of your existing schema.
-- Adds subjects, and makes attendance track "which subject" not just "which day".

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

alter table subjects enable row level security;
create policy "logged in users can read subjects" on subjects
  for select using (auth.role() = 'authenticated');
create policy "logged in users can add subjects" on subjects
  for insert with check (auth.role() = 'authenticated');

-- Give any existing attendance rows a placeholder subject, so we can
-- safely make the new column required afterwards.
insert into subjects (name) values ('General') on conflict (name) do nothing;

alter table attendance add column if not exists subject_id uuid references subjects(id);

update attendance
set subject_id = (select id from subjects where name = 'General')
where subject_id is null;

alter table attendance alter column subject_id set not null;

-- One attendance record per student, per subject, per day (not just per day).
alter table attendance drop constraint if exists attendance_student_id_attendance_date_key;
alter table attendance add constraint attendance_student_subject_date_key
  unique (student_id, subject_id, attendance_date);
