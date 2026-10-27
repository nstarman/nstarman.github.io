# Contract: the count line

Printed above a publication list (or on its heading's line, as the Legend place says) wherever its
section's `tally` is set — unchanged wording:

> **19 papers** (5 submitted): 10 first-author, 4 led by students I supervised. h-index N (Source).

- With `of: "record"`: the numbers are the whole record's (every non-in-prep publication), whatever
  the list shows. The 1-page and 2-page CVs print exactly the numbers above (today's record).
- Without it: the numbers are the list's papers, in-prep ones left out.
- The h-index is the named source's, either way.
- Builder: the Tally box, then **Whole record** (only while Tally is ticked), then the h-index menu,
  in the publication list's settings row. Preview and Compile PDF agree; Save keeps it; "Start from"
  sets it as the preset has it; a file without `of` counts the ticked papers.

## Short form and place

> **19 papers** (10 first-author, 5 submitted). h-index N (Source).

- `form: "short"`: no student-led number; ", S submitted" only when S > 0.
- `place["<id>.tally"]`: `below` its own line at the left (default), `right` its own line at the right,
  `title` the heading's line at its right, before the student key when that is there too; a list with
  no heading puts it on its own line.
- The 1-page and 2-page CVs: whole record, short form, on the heading line.
- Builder: a **Short** box beside Whole record, and a **Place** for the count (Below, Right, Title)
  on a Tally line of the publication list's settings row.
