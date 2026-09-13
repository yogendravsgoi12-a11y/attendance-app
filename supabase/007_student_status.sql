-- Run this once in the SQL Editor, on top of your existing schema.
-- Adds a status field so admins can deactivate a student (hides them from
-- the active list and from future attendance scans) without deleting
-- their attendance history.

alter table students
  add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive'));
