---
name: Bojji
description: Free notes and tasks kept as Markdown in your own GitHub, in the Apple Notes and Reminders three-pane layout.
colors:
  # Light scheme (default)
  pane: "#ffffff"
  sidebar-grey: "#f2f1f6"
  ink: "#1d1d1f"
  ink-secondary: "#6e6e73"
  ink-tertiary: "#66666b"
  hairline: "#e5e5ea"
  fill-grey: "#f2f2f5"
  notes-yellow: "#ffe27a"
  ink-on-yellow: "#1d1d1f"
  quiet-select: "#e8e7ec"
  ink-on-quiet: "#5c5c61"
  deep-mustard: "#b07d00"
  check-gold: "#e0a800"
  overdue-red: "#b8000f"
  focus-blue: "#0071e3"
  # Dark scheme (prefers-color-scheme: dark), same roles in graphite
  pane-dark: "#1c1c1e"
  sidebar-grey-dark: "#252528"
  ink-dark: "#f5f5f7"
  ink-secondary-dark: "#a1a1a6"
  ink-tertiary-dark: "#8e8e93"
  hairline-dark: "#38383a"
  fill-grey-dark: "#2c2c2e"
  notes-yellow-dark: "#6b5410"
  ink-on-yellow-dark: "#fff6d6"
  quiet-select-dark: "#3a3a3c"
  ink-on-quiet-dark: "#c7c7cc"
  deep-mustard-dark: "#ffd426"
  check-gold-dark: "#ffcc00"
  overdue-red-dark: "#ff6961"
  focus-blue-dark: "#4da3ff"
  # Matte tag palette: background + text pairs, hue picked by hashing the tag name
  tag-sage-bg: "#e3ebe1"
  tag-sage-fg: "#3d5a3a"
  tag-clay-bg: "#f1e2da"
  tag-clay-fg: "#7a3f26"
  tag-slate-bg: "#e0e6ef"
  tag-slate-fg: "#34507a"
  tag-mustard-bg: "#f0e8d2"
  tag-mustard-fg: "#6b5410"
  tag-plum-bg: "#ebe0ea"
  tag-plum-fg: "#6a3762"
  tag-teal-bg: "#dceceb"
  tag-teal-fg: "#23595a"
  tag-rose-bg: "#f2e0e2"
  tag-rose-fg: "#823a46"
  tag-stone-bg: "#e8e6e1"
  tag-stone-fg: "#55524a"
  tag-sage-bg-dark: "#2f3a2e"
  tag-sage-fg-dark: "#b9d1b4"
  tag-clay-bg-dark: "#3d2c25"
  tag-clay-fg-dark: "#e6b9a2"
  tag-slate-bg-dark: "#283241"
  tag-slate-fg-dark: "#b0c3e3"
  tag-mustard-bg-dark: "#3a3220"
  tag-mustard-fg-dark: "#e3cd8d"
  tag-plum-bg-dark: "#382a37"
  tag-plum-fg-dark: "#dcb6d6"
  tag-teal-bg-dark: "#223635"
  tag-teal-fg-dark: "#a6d4d2"
  tag-rose-bg-dark: "#3d2a2d"
  tag-rose-fg-dark: "#e8b3bb"
  tag-stone-bg-dark: "#34332f"
  tag-stone-fg-dark: "#cfccc3"
typography:
  list-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  item-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body-heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-subheading:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  group-head:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  reading:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'cv11', 'ss03'"
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  tag-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
  sidebar-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Inter\", system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
rounded:
  link: "4px"
  focus: "6px"
  row: "8px"
  field: "9px"
  tag: "10px"
  chip: "13px"
  chip-lg: "15px"
  full: "50%"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  sidebar-width: "240px"
  list-width: "320px"
  toolbar-height: "52px"
components:
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.row}"
    padding: "0 8px"
    height: "32px"
  nav-item-hover:
    backgroundColor: "{colors.quiet-select}"
  nav-item-active:
    backgroundColor: "{colors.quiet-select}"
    textColor: "{colors.ink}"
  nav-item-phone:
    height: "44px"
  note-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.row}"
    padding: "8px 12px"
  note-row-selected:
    backgroundColor: "{colors.notes-yellow}"
    textColor: "{colors.ink-on-yellow}"
  task-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.row}"
    padding: "8px 12px 0"
  task-row-selected:
    backgroundColor: "{colors.quiet-select}"
    textColor: "{colors.ink}"
  task-row-done:
    textColor: "{colors.ink-tertiary}"
  checkbox:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    size: "20px"
  checkbox-checked:
    backgroundColor: "{colors.check-gold}"
    rounded: "{rounded.full}"
    size: "20px"
  search-field:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.field}"
    padding: "0 8px"
    height: "30px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.row}"
    size: "32px"
  icon-button-hover:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.ink}"
  back-button:
    textColor: "{colors.ink}"
    padding: "0 8px 0 0"
    height: "32px"
  tag-chip:
    backgroundColor: "{colors.tag-slate-bg}"
    textColor: "{colors.tag-slate-fg}"
    typography: "{typography.tag-label}"
    rounded: "{rounded.tag}"
    padding: "0 7px"
    height: "20px"
  tag-chip-editable:
    rounded: "{rounded.chip}"
    padding: "0 4px 0 10px"
    height: "26px"
  date-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "0 8px"
    height: "26px"
  date-chip-set:
    backgroundColor: "{colors.fill-grey}"
    textColor: "{colors.ink}"
  date-chip-field:
    typography: "{typography.ui}"
    rounded: "{rounded.chip-lg}"
    padding: "0 12px"
    height: "30px"
  title-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.item-title}"
    padding: "0"
  sync-footer:
    backgroundColor: "{colors.sidebar-grey}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.caption}"
    padding: "12px 8px 4px"
---

# Design System: Bojji

## Overview

**Creative North Star: "The Familiar Three Panes"**

Bojji is the Apple Notes and Reminders layout played straight: a light grey sidebar, a white list pane and a white detail pane, divided by hairlines and set in the system face. Nothing on the surface is invented for its own sake. Someone who has used Notes or Reminders on a Mac knows where everything is before reading a word. The one new idea is the sync footer, where every edit settles into "Kept in your GitHub" next to the user's name.

The density is a native desktop app's: 14px UI text, 32px sidebar rows, 52px toolbars, and type weight and grey steps carrying the hierarchy instead of boxes or colour. Colour is rationed. One warm Notes yellow marks the selected note, fills the completed checkbox and tints the non-text glyphs (sidebar icons, back chevron, text caret, the Today dot) in a deeper tone. The only other hues are the matte tag pairs, each tag keeping one hue everywhere it appears, and the overdue red. Dark mode keeps the same roles in graphite.

The world is flat and quiet. Depth comes from the tonal step between the sidebar and the panes and from inset hairlines, never from cards or shadows. Motion is brief and functional: a ticked task fades and slides 8px out of the list, and the sync glyph spins while saving.

**Key Characteristics:**
- Three panes (240px sidebar, 320px list, fluid detail) on desktop; one pane at a time on phones.
- System SF type with self-hosted Inter as the fallback; bold, tightly tracked titles over plain 14px UI text.
- A single warm yellow, kept off text; matte per-tag hues; red only for overdue.
- Hairline separators inset to the text column; flat panes, no shadows.
- Thin 1.6-stroke line icons on a 24px grid, drawn as inline SVG symbols.

## Colors

A neutral Apple-grey system with one warm yellow accent, a small matte palette for tags, and a red used only for overdue dates. Every role has a light value and a `-dark` counterpart; the dark set applies under `prefers-color-scheme: dark`.

### Primary
- **Notes Yellow** (`notes-yellow` / `notes-yellow-dark`): the selected note row's fill and the text-selection highlight. Text on it is always **Ink on Yellow**, which stays well above AA (about 13:1 in light mode).
- **Deep Mustard** (`deep-mustard` / `deep-mustard-dark`): the yellow deepened to about 3.2:1 on the sidebar so it reads as a glyph colour. Used for sidebar list icons, the phone back chevron and the text caret in the title and body fields. Never used for text.
- **Check Gold** (`check-gold` / `check-gold-dark`): the fill and border of a completed checkbox, the hover border of an open checkbox, and the small Today dot beside the Week schedule's current day.

### Tertiary
- **Matte tag palette** (`tag-<hue>-bg` / `tag-<hue>-fg`, plus `-dark`): eight hues (sage, clay, slate, mustard, plum, teal, rose, stone), each a pale tinted background with a deep same-hue text colour (about 6:1). A tag's hue comes from a hash of its lowercased name (`h = h*31 + charCode`, seed 7, modulo 8), so one tag looks the same on a row chip, in the editor and as its sidebar icon.
- **Overdue Red** (`overdue-red` / `overdue-red-dark`): due-date text for overdue and "Yesterday" tasks only.

### Neutral
- **Pane White / Graphite** (`pane` / `pane-dark`): list and detail panes.
- **Sidebar Grey** (`sidebar-grey` / `sidebar-grey-dark`): the sidebar, one tonal step off the panes. That step is the main source of depth.
- **Ink** (`ink` / `ink-dark`): primary text, row titles, note-row times.
- **Ink Secondary** (`ink-secondary` / `ink-secondary-dark`): row metadata, due dates, past day headings, toolbar icons at rest, sync copy.
- **Ink Tertiary** (`ink-tertiary` / `ink-tertiary-dark`): counts, sidebar group labels, placeholders, the detail stamp, empty states, completed task titles, the open checkbox ring.
- **Hairline** (`hairline` / `hairline-dark`): every separator, the sync footer rule, scrollbar thumbs.
- **Fill Grey** (`fill-grey` / `fill-grey-dark`): the search field, icon-button hover, set date chips, the default tag fallback.
- **Quiet Select** (`quiet-select` / `quiet-select-dark`) with **Ink on Quiet** for secondary text on it: the selected task row, the active sidebar item and sidebar hover.
- **Focus Blue** (`focus-blue` / `focus-blue-dark`): the 2px keyboard focus ring, offset 2px. This is the only blue in the system.

### Named Rules
**The One Yellow Rule.** Yellow appears in three tones and only in these places: selected note fill, checkbox fill, and non-text glyphs. It never colours text. If a new surface wants an accent, it uses one of these roles or none.

**The Two Selections Rule.** A selected note is yellow; a selected task and the active sidebar item are quiet grey. Notes and Reminders each select this way, and the difference tells the user which kind of item is open.

**The One Hue Per Tag Rule.** A tag's colour is derived from its name, never chosen per screen, and tag hues are used only for that tag's chip and its sidebar icon, never for other chrome.

## Typography

**Display Font:** none. There is no separate display face; titles are the system face in bold.
**Body Font:** -apple-system / SF Pro Text, then self-hosted Inter variable (OFL, latin and latin-ext subsets, weights 100 to 900), then system-ui.
**Label/Mono Font:** none.

**Character:** The platform's own voice. On Apple devices the page renders in SF; elsewhere Inter with `cv11` and `ss03` stands in. Titles are heavy and slightly tightened, and everything else is plain regular text.

### Hierarchy
- **List title** (700, 26px, 1.15, -0.02em): the list pane heading ("Today", "Week schedule", "#Siemens"). The item count sits beside it at 26px, weight 600, in Ink Tertiary, using tabular figures.
- **Item title** (700, 24px, 1.25, -0.015em): the editable title in the detail pane.
- **Body heading** (700, 19px, 1.3, -0.01em) and **body subheading** (600, 16px): rendered Markdown `##` and `###`.
- **Group head** (600, 15px): Week schedule day headings (with the date in 13px regular Ink Secondary) and in-list section heads such as "Notes".
- **Reading** (400, 15px, 1.6): note bodies, held to a 68ch measure.
- **UI** (400, 14px, 1.45): rows, sidebar items, fields. Row titles step up to 600 in note rows.
- **Meta** (400, 13px): note-row preview line, list date range, counts, toggles, empty-day text, the sidebar brand (600, Ink Secondary).
- **Caption** (12px): due dates, the detail stamp, sync footer text (the name in 500 Ink).
- **Tag label** (500, 12px, line-height 1; 13px in the editor).
- **Sidebar label** (600, 11px, sentence case, Ink Tertiary): the "Tasks", "Notes" and "Tags" group headings, as in the macOS sidebar.

### Named Rules
**The Tabular Count Rule.** Counts, times and totals use `font-variant-numeric: tabular-nums` so columns of numbers don't shift.

**The Weight Before Colour Rule.** Hierarchy comes from weight (700/600/400) and the three ink steps. Headings get no colour or decoration.

## Layout

**Desktop (above 760px):** a full-viewport grid of `240px | 320px | 1fr` at `100dvh`, with body scroll off and each pane scrolling on its own. The sidebar is padded 24px top and 12px sides and bottom; the sync footer is pinned to its bottom by `margin-top: auto`. The list pane has a 52px toolbar (search field plus one context-aware compose button: a new task in task lists, a new note in notes, shortcut N), a list head (title and count, with an optional date range), then scrolling rows padded 8px at the sides. The detail pane has a 52px toolbar with actions on the right (delete), then a "paper" region padded 32px at the sides and 48px at the bottom, with content centred at a 68ch maximum width. Field rows (Tags, Due, Status) use a 72px label column.

**Phone (760px and below):** one pane at a time, chosen by `data-view` (`sidebar`, `list` or `detail`) on the app root. Each pane is at least `100dvh` and the document scrolls. Toolbars grow by `env(safe-area-inset-top)`, and so does the sidebar's top padding. A back control (a Deep Mustard chevron and the parent's name in Ink at 16px) appears at the left of each toolbar. Sidebar rows grow to 44px tap targets at 16px text. The paper's side padding drops to 16px and the rows get 48px of bottom padding.

**Spacing rhythm:** a 4/8/12/16/24/32/48 scale (`s1` to `s7`). Tight steps (4 to 8px) sit inside rows, chips and meta lines; 16 to 24px separate groups and sections; 48px pads empty states and scroll ends. The Week schedule lists every day from Monday to Sunday, including past days (headings in Ink Secondary), with a "No tasks" line indented 44px to the title column.

**The One Pane At A Time Rule.** On phones, never show two panes side by side. New pages extend the same three views and the back-chevron chain.

## Elevation & Depth

The system is flat. Depth comes from tonal layering (the sidebar grey against white or graphite panes), 1px hairlines and fill-grey wells. Rows, panes, fields and chips have no shadows, and nothing floats in the shipped build. A `--shadow` custom property is declared but not used anywhere, so it is not part of the system yet.

### Named Rules
**The Flat Panes Rule.** Panes and rows stay flat at rest and when selected; selection is a fill, never a lift. A shadow may only appear on a real floating layer (a menu, popover or sheet, as in Apple's own apps), and the first one needs a review before it becomes a token.

**The Inset Hairline Rule.** List separators begin at the text column, not the pane edge. Note rows draw the line 12px in from both sides; task rows draw it under the title body only, so it starts after the checkbox. The separators next to a selected row disappear so the selection fill reads as one piece.

## Shapes

Gently rounded and native. Rows, the sidebar items and icon buttons share an 8px radius. The search field is 9px. Every chip is a full pill whose radius is half its height (tags 10px at 20px tall, editor tags and date chips 13px at 26px, field date chips 15px at 30px). Checkboxes, the tag remove button and the Today dot are circles. Focus rings round at 6px. There are no outer borders on panes or fields; the only strokes are hairlines and the 1.5px checkbox ring. Icons are 24px-grid SVG symbols drawn at 18px with a 1.6 stroke and round caps and joins (smaller in chips and the footer: 12 to 16px).

## Components

### Buttons
Quiet, chrome-free controls that look like part of the pane until hovered.
- **Shape:** 32px square icon buttons, gently rounded (8px).
- **Icon button:** Ink Secondary icon on transparent; on hover Fill Grey with an Ink icon.
- **Back button (phone):** a 22px Deep Mustard chevron followed by the parent list's name in Ink, 16px.
- **Text actions:** "Remove" on a due date and the "Show/Hide completed (n)" toggle are plain text in Ink Secondary (13px; the toggle is 500) that turns Ink on hover. No fill, no underline.
- **Focus:** a global 2px Focus Blue outline, offset 2px, 6px radius.

### Chips
- **Tag chip:** a 20px pill with a matte hue background and same-hue deep text, 12px/500, shown as `#name`. Clicking a chip opens that tag's view; hover mixes 18% of the text colour into the background. In a tag's own view, that tag's chip is left off the rows.
- **Editable tag (detail pane):** a 26px pill at 13px with a 20px circular remove "×" at 70% opacity (100% with a tinted background on hover). The add input sits inline after the chips and uses the tag datalist; Enter adds a tag, and Backspace in an empty input removes the last one.
- **Date chip:** a 26px pill with a calendar glyph, Ink Secondary on transparent; once a date is set (or on hover) it becomes Ink on Fill Grey. It wraps a hidden native date input. The detail-pane version is 30px at 14px.

### Lists / Rows
- **Note row:** title in 600 on one ellipsised line; under it a meta line with the edited time in Ink and the first line of the body in Ink Secondary at 13px; then optional tag chips. Selected: Notes Yellow fill with all text in Ink on Yellow.
- **Task row:** a checkbox, then the title (wraps anywhere) and an optional meta line with the due date in 12px Ink Secondary (Overdue Red when late) followed by tag chips. Selected: Quiet Select fill, with the due date in Ink on Quiet. Done: the title goes to Ink Tertiary.
- **Add row:** a "+" glyph in Ink Tertiary aligned to the checkbox column, an inline borderless input ("New task"), and a date chip at the end.
- **Day group (Week schedule):** a 15px/600 day name with its 13px date; past days in Ink Secondary; today labelled "Today" with a 6px Check Gold dot.
- **Empty states:** centred Ink Tertiary text with 48px padding, phrased plainly ("Nothing due today.", "No notes match.").

### Checkbox (signature)
A 20px circle with a 1.5px Ink Tertiary ring and a hit area extended 12px on every side. Hover turns the ring Check Gold. When checked, it fills Check Gold and a 12px ink-coloured tick (`--check-mark`, about 8:1 on the gold in both modes) scales in from 0.6 (0.2s opacity, 0.25s transform on the system ease). A task ticked in an open list stays put for 450ms, then fades and slides 8px right over 350ms before the list re-renders.

### Inputs / Fields
- **Search:** a 30px Fill Grey well with a 9px radius, a 15px search glyph and the placeholder in Ink Tertiary. No border and no focus glow beyond the global focus ring.
- **Detail fields:** the title and body are borderless and blend into the paper, with a Deep Mustard caret. The body shows rendered Markdown (15px/1.6) and switches to a raw textarea when clicked or when Enter is pressed. Field rows are separated by hairlines above, with one below the last row.
- **Stamp:** a centred 12px Ink Tertiary timestamp above the title.

### Navigation
- **Sidebar:** the app name ("Bojji", 13px/600 Ink Secondary), then groups (Tasks: Today, Week schedule, All tasks, Completed; Notes; Tags), each with an 11px sentence-case label. Items are 32px rows with an 18px glyph (Deep Mustard, or the tag's own hue for tag items), a label and a right-aligned tabular count in Ink Tertiary. Hover and active both use Quiet Select, and the active item is also 600 weight.
- **Sync footer (signature):** pinned below a hairline. A 16px state glyph (cloud with a tick when kept, a spinning arc while saving or loading, a struck cloud when offline, an alert for a conflict or error), the user's name in 500 Ink with the time on the right ("Just now", then a timestamp), and under it the state line. In the kept state, that line is a "Kept in your GitHub" link to the user's storage repo with a 12px external glyph; it underlines on hover. The footer is a polite live region.

## Do's and Don'ts

### Do:
- **Do** take every colour from the role tokens and their `-dark` pair; new surfaces inherit dark mode by using the same custom properties.
- **Do** select notes in Notes Yellow and tasks and sidebar items in Quiet Select.
- **Do** derive a tag's hue from its name with the shared hash and reuse the same `t0` to `t7` pair everywhere that tag appears.
- **Do** inset hairlines to the text column and hide them next to a selected row.
- **Do** make every chip a pill whose radius is half its height, and keep rows and icon buttons at 8px.
- **Do** draw icons as 24px-grid inline SVG symbols with a 1.6 stroke and round caps, at 18px in rows and toolbars.
- **Do** give touch targets at least 44px on phones (sidebar rows) and extend small hit areas such as the checkbox's.
- **Do** keep reading text at 15px/1.6 within a 68ch measure.
- **Do** honour `prefers-reduced-motion` by removing all transitions and animations.

### Don't:
- **Don't** put yellow (any of its three tones) on text.
- **Don't** add shadows, cards or raised panels to panes or rows; selection is a fill.
- **Don't** use tag hues for anything other than the tag's own chip and sidebar icon, and don't add hues beyond the eight.
- **Don't** colour due dates except Overdue Red for late tasks.
- **Don't** introduce a second accent, a display face, or emoji and text glyphs as icons.
- **Don't** show more than one pane at a time at 760px and below.
