-- Run this once in the SQL Editor, on top of your existing schema.
-- Adds a 'student' role, a way to link a login account to one specific
-- student record, and tightens security so students can only ever see
-- their own data (not other students' data).

-- Allow 'student' as a role.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'teacher', 'student'));

-- Store email on profiles too, so admins/teachers can look someone up by
-- email when linking their account to a student record.
alter table profiles add column if not exists email text;

update profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id and profiles.email is null;

-- New signups can now say whether they're a teacher or a student.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Links one login account to one student record. Only an admin/teacher
-- can set this (see the policies below), which is what keeps a student
-- from ever "claiming" someone else's record.
alter table students add column if not exists user_id uuid references auth.users(id);
create unique index if not exists students_user_id_key on students(user_id) where user_id is not null;

-- Replace the old "any logged-in user" rules on students/attendance with
-- role-aware ones: staff (admin/teacher) can see and manage everyone;
-- a student can only see their own linked record.
drop policy if exists "logged in users can read students" on students;
drop policy if exists "logged in users can add students" on students;
drop policy if exists "logged in users can update students" on students;

create policy "staff can read all students" on students
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "students can read their own record" on students
  for select using (user_id = auth.uid());

create policy "staff can add students" on students
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "staff can update students" on students
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );

drop policy if exists "logged in users can read attendance" on attendance;
drop policy if exists "logged in users can write attendance" on attendance;
drop policy if exists "logged in users can update attendance" on attendance;

create policy "staff can read all attendance" on attendance
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "students can read their own attendance" on attendance
  for select using (
    exists (
      select 1 from students
      where students.id = attendance.student_id and students.user_id = auth.uid()
    )
  );

create policy "staff can write attendance" on attendance
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );

create policy "staff can update attendance" on attendance
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'teacher'))
  );
