---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: []
---

# Surface brief: main app page

Scope: the main Bojji app page (public/index.html). It won the two-draft comparison and is now the app. Mode: Operate.
Audience and job: anyone, including non-technical people, capturing tasks and writing notes daily on desktop, later on phones. Task: add, tick off and review tasks with due dates; write and find Markdown notes; trust that everything is kept in their own GitHub account.
Constraints: runs on the user's GitHub data repo through the local server, or as a demo on sample data elsewhere. Must collapse to a single-pane flow at phone width, since the winner extends to mobile.
Chosen direction: the category standard (Apple Notes / Reminders three-pane), played straight at full craft. Bar: Apple Notes and Reminders on macOS.
Memorable moment: the sync status in the sidebar footer, where every edit visibly settles to "Kept in your GitHub".
Unresolved: real sign-in, conflict UI copy, attachments, search beyond titles.

## Direction contract

THESIS: Bojji is the Apple Notes and Reminders layout, executed with Apple's own restraint: sidebar, list, detail. It refuses invention for its own sake; the only new idea on the page is that saving visibly lands in the user's account.
OWN-WORLD: White content panes over a light grey sidebar, system SF type, hairline separators, round grey-ring checkboxes, one warm Notes-yellow, used for note selection, the checkbox fill and the non-text glyphs (sidebar icons, back chevrons, caret) in a deepened 3:1 tone, never for text, thin 1.6-stroke line icons. Dark mode mirrors it in graphite.
STORY: The visitor sees today's tasks and their notes at once, ticks things off, opens a note and types; the footer quietly confirms each change is kept in their GitHub.
FIRST VIEWPORT: 240px sidebar (smart lists Today, Week schedule (Monday to Sunday, past days included, grouped by day), All tasks, Completed; Notes; a Tags section listing every tag with its count; at the foot the user's name and the sync state, whose 'Kept in your GitHub' links to their storage repo), 320px list pane with search and add, detail pane filling the rest showing the selected item at reading measure. One context-aware compose action top right of the list (new task in task lists, new note in notes), as Notes and Reminders each do.
FORM: canon (the category standard), chosen by the user over the roll; seed key b925658a.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
