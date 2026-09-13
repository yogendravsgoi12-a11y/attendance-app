-- Run this once in the SQL Editor, on top of your existing schema.
-- It adds login + roles, and locks down data to logged-in users only.

-- One row per user, holding their role. Created automatically on signup.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table profiles enable row level security;
create policy "anyone logged in can view profiles" on profiles
  for select using (auth.role() = 'authenticated');
create policy "users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- Replace the old "allow all" rules with "must be logged in" rules.
drop policy if exists "allow all on students" on students;
drop policy if exists "allow all on attendance" on attendance;

create policy "logged in users can read students" on students
  for select using (auth.role() = 'authenticated');
create policy "logged in users can add students" on students
  for insert with check (auth.role() = 'authenticated');
create policy "logged in users can update students" on students
  for update using (auth.role() = 'authenticated');
create policy "only admins can delete students" on students
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "logged in users can read attendance" on attendance
  for select using (auth.role() = 'authenticated');
create policy "logged in users can write attendance" on attendance
  for insert with check (auth.role() = 'authenticated');
create policy "logged in users can update attendance" on attendance
  for update using (auth.role() = 'authenticated');

-- Photo uploads now require login too (photos stay publicly viewable by
-- URL, which is what lets <img> tags show them in the app).
drop policy if exists "public upload student photos" on storage.objects;
create policy "logged in users can upload student photos" on storage.objects
  for insert with check (bucket_id = 'student-photos' and auth.role() = 'authenticated');

drop policy if exists "public upload classroom photos" on storage.objects;
create policy "logged in users can upload classroom photos" on storage.objects
  for insert with check (bucket_id = 'classroom-photos' and auth.role() = 'authenticated');
