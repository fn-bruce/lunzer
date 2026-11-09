---
name: Lunzer
description: Indoor conference wayfinding drawn as a sprint-orienteering course map.
colors:
  paper: "#ffffff"
  ink: "#161616"
  ink-soft: "#464646"
  course: "#b0106b"
  floor: "#f0e2c4"
  booth: "#bcbcbc"
  booth-dim: "#e6e2d9"
  water: "#1f86cf"
  plant: "#3c9e45"
  open: "#ffd23f"
  oob: "#a99f35"
  ramp: "#8f5f2e"
  rule-soft: "#d4cdbd"
typography:
  display-xl:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.2rem, 5vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.005em"
  display-hero:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.3rem, 3.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0em"
  heading:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0.03em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-lg:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  note:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(16px, 2.4vw, 32px)"
  row: "8px"
  stack: "14px"
  column: "22px"
  section: "clamp(56px, 8vw, 112px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 28px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-planned:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "0 40px"
    height: "50px"
  input-combobox:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "48px"
  combobox-option-active:
    backgroundColor: "{colors.open}"
    textColor: "{colors.ink}"
  toggle-box:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "22px"
---

# Design System: Lunzer

## Overview

**Creative North Star: "The Sprint-Orienteering Map"**

Every surface is a printed orienteering map on white paper: black detail, flat map inks, a legend that names every colour, and one magenta overprint for the course. The page is ruled, not carded. Heavy 2px black rules divide map, legend margin and sections; content sits in ruled lists like a control description sheet.

Density is map-like in the first viewport (map two thirds, legend margin one third) and opens to wide, quiet sections below. Corners are square everywhere. Depth is nearly absent.

**Key Characteristics:**
- Flat map inks on white, each one a legend entry.
- Magenta means the route and nothing else.
- Solid line means built; dashed line means planned.
- Condensed uppercase sans for codes, labels and headings; hyperlegible sans for reading.
- Tabular numerals site-wide.

## Colors

A map-key palette: flat, saturated inks on paper, never tints or gradients.

### Primary
- **Course Magenta** (`course`): the route line, control circles, control numbers, the course strip's connecting line. Nothing else.

### Secondary
- **Map inks**: Paved Tan (`floor`), Booth Grey (`booth`), Water Blue (`water`), Planter Green (`plant`), Open Lounge Yellow (`open`), Out-of-Bounds Olive (`oob`, always striped), Ramp Brown (`ramp`). Used on the map and its legend swatches.
- **Open Lounge Yellow** doubles as the interaction highlight: text selection, combobox focus ring, active combobox option.

### Neutral
- **Paper** (`paper`): page ground.
- **Map Black** (`ink`): text, walls, rules, primary button, focus outline.
- **Soft Ink** (`ink-soft`): secondary text, meta, notes, planned/disabled states.
- **Faded Booth** (`booth-dim`) and **Soft Rule** (`rule-soft`): off-route booths when the map focuses on a course; light swatch borders.

**The Magenta Is The Route Rule.** Course Magenta never appears on buttons, links, headings, or decoration. If it is not the course, it is not magenta.

**The Legend Rule.** Every ink on the page is a named map-key entry. A new colour enters only with a legend entry.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow fallback), self-hosted at 600, 700, 800.
**Body Font:** Atkinson Hyperlegible Next (with system-ui fallback), self-hosted variable 200-800.

**Character:** Map-margin lettering. Condensed caps carry codes, labels and distances; the hyperlegible sans carries sentences.

### Hierarchy
- **Display XL** (`display-xl`): section headlines, uppercase, max 18ch.
- **Display Hero** (`display-hero`): the first-viewport headline in the legend margin, uppercase, tight leading.
- **Heading** (`heading`): sheet titles, map name, uppercase.
- **Label** (`label`): field labels, fieldset legends, booth codes, distances, buttons (buttons at 800, 1.25rem, 0.06em). Uppercase.
- **Body** (`body`): reading text, max 40-64ch.
- **Body Large** (`body-lg`): standalone section paragraphs.
- **Note** (`note`): legend text, step notes, option kinds, in Soft Ink.

**The Tabular Rule.** Numerals are tabular everywhere (`font-variant-numeric: tabular-nums` on body), so metres align in the description sheet.

## Layout

Full-bleed bands separated by 2px black rules, padded by the fluid gutter. Desktop first viewport is a two-column grid: map flexible, legend margin 340-410px, capped at viewport height minus the 56px top bar. Sections below use the fluid section padding.

At 960px and below the stage stacks: headline, form, map, then the description sheet (the margin column dissolves via `display: contents` and reorders). At 720px and below, two-column halves and status columns stack, the course strip turns vertical, and the map holds 700px wide inside a horizontal pan region with a pan hint.

**The Ruled Sheet Rule.** Lists are ruled rows: 1px black top border on the list, 1px black bottom border per row, 8-10px vertical padding. No cards, no zebra fills.

## Elevation & Depth

Flat. The one shadow is a soft drop under the open combobox list so it reads above the form. Nothing else lifts.

## Shapes

Square corners throughout (`rounded.none`) on inputs, buttons, toggles, panels. The only radius is 2px on the global focus outline. Round forms belong to map symbols alone: control circles, finish double ring, start triangle.

**The Provenance Line Rule.** Built things are drawn with solid lines; planned things with dashed lines. Applies to borders, rule lists, inset frames, the status line marks and the disabled GO button.

## Components

### Buttons
- **Primary** (`button-primary`): black fill, white condensed caps, 2px black border, square. Hover inverts to paper with black text. Active nudges down 1px. Transition 160ms ease-out.
- **Planned** (`button-planned`): disabled, paper fill, Soft Ink text, 2px dashed Soft Ink border, `not-allowed` cursor. Marks a feature that is not built.

### Inputs
- **Combobox** (`input-combobox`): 48px, 2px black border, square. Focus shows a 3px Open Lounge Yellow outline. Invalid state turns the border dashed. Options list a condensed code column (52px) beside the name; the active option fills yellow.
- **Toggle**: 22px square box, 2px black border; checked fills a 10px black square that scales in (160ms ease-out). Label bold, helper text in Note below.

### Control description sheet
Ruled rows: control mark (magenta circle with magenta number), instruction, condensed distance right-aligned.

### Map
SVG drawn in map inks. Booths grey with thin black stroke; off-route booths fade to Faded Booth and their labels to 18% opacity when a course is shown. Course: 4px magenta round-capped line, 3px control circles, magenta numbers haloed in paper.

**The Course Draws Itself Rule.** On a found route, legs draw in sequence by stroke-dashoffset (linear, total 500-1400ms by length) and control circles land from 1.8x scale over 380ms ease-out. Reduced motion shows the course static.

## Do's and Don'ts

**Do:**
- Name every new colour in the map legend before using it.
- Use dashed strokes for anything planned, solid for anything built.
- Set codes, distances and labels in condensed uppercase.
- Keep corners square and surfaces flat.

**Don't:**
- Use Course Magenta for anything but the route.
- Add tints, gradients or card shadows to page surfaces.
- Show a planned feature with solid lines or an enabled control.
