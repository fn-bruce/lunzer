---
version: 1
slug: "app-public-index-html"
primary_target: "app/public/index.html"
related_targets: ["app/server.js"]
---

# Surface: Lunzer hackathon pitch + demo map (`/`)

Mode: Persuade. Audience today: hackathon judges and attendees; the product's users are conference attendees on phones. Action: route from a start to a booth in the live demo. Proof: the working route on a sample hall. Constraints: proof of concept, sample data labeled, Bluetooth/live GO/Elasticsearch shown as planned, never as built. Build path: code-led (no image generation).

## Direction contract

THESIS: Every trip across the hall is an orienteering course: start triangle, numbered control circles, finish double ring, one magenta line. Refuses the indoor-maps default of a headline beside a phone mockup.

OWN-WORLD: Sprint-orienteering map inks on white paper: black detail, grey booths, tan paved floor, blue water, green planters, yellow open lounge, olive striped out-of-bounds, magenta overprint reserved for the route alone. Legend-entry discipline: every ink on the page is named in the map key. Condensed sans for codes and headings, a hyperlegible sans for text, tabular numerals for metres.

STORY: A judge sees a real route already drawn, changes start or destination, flips wheelchair, watches the course redraw via the ramp, then reads the problem, the two ways in (typed now, Bluetooth planned) and what is built versus planned.

FIRST VIEWPORT: Desktop: the sample hall map fills about two thirds of the width, course drawn Fountain to booth 512 on the mezzanine. Right margin is the map's legend column: headline, From/To comboboxes, Wheelchair and No-stairs toggles, Find route (primary, black), then the control description sheet. Phone: headline, form, map full width, descriptions.

FORM: Orienteering course map, candidate 7 of 7. seed:b77b8bc95289b03e. Raises: legend-only colour (exposure record); one moving now-marker (step row); one toggle redraws the course (cape); built solid, planned dashed (provenance ribbon); How A and How B as mirrored halves (fight poster); magenta only means route (generative identity). Signature interaction: the course draws itself control by control when a route is found. Motion grammar: stroke draw plus control circles landing in sequence, reduced-motion shows it static.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
