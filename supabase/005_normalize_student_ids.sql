-- Run this once in the SQL Editor, on top of your existing schema.
--
-- IMPORTANT: if this fails with "duplicate key value violates unique
-- constraint", it means two students already share the same ID once
-- casing/spacing is ignored (e.g. "st001" and "ST001"). Go to
-- Table Editor -> students, find them, and either change one student's
-- ID or delete the extra row, then run this again.

update students set student_id = upper(trim(student_id));

-- Extra safety net: blocks future duplicates even if something ever
-- inserts a row without going through the app.
create unique index if not exists students_student_id_upper_idx
  on students (upper(student_id));
