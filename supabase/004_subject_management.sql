-- Run this once in the SQL Editor, on top of your existing schema.
-- Adds permission to rename subjects and (for admins) delete them.

create policy "logged in users can rename subjects" on subjects
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "only admins can delete subjects" on subjects
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Note: a subject that already has attendance records can't be deleted
-- (the database protects that history) — the app will show a clear
-- message if that happens.
