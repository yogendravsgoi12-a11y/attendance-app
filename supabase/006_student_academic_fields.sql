-- Run this once in the SQL Editor, on top of your existing schema.
-- Adds optional academic fields used for grouping reports.

alter table students add column if not exists department text;
alter table students add column if not exists branch text;
alter table students add column if not exists semester text;
