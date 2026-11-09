# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS served by the existing dependency-free Node server (`app/server.js`), shipped as a container to the team's Kubernetes cluster through GitOps. Later: installable PWA; native iOS and Android clients are a future step.

## Users

Conference attendees moving between vendor booths, conference rooms and landmarks many times a day (20–30 trips per conference day). Includes attendees who use wheelchairs or cannot take stairs and need elevator/lift routes. Secondary audience today: hackathon judges evaluating the proof of concept.

## Product Purpose

Lunzer is an indoor conference navigator. It answers three questions an attendee otherwise solves by hand on every trip: where am I on the map, where is my destination, and what is the most efficient walking (or walk + shuttle) route between them. Success: an attendee gets a correct, obstacle-aware route in seconds without spending working memory on map reading.

## Positioning

Route-level directions inside the conference floor, not just a static map: routes respect walls and booths, avoid redundant movement, offer an accessibility-specific route, and can strip the map down to the landmarks along the route so the user stays on course.

## Operating Context

Used on a phone, in a crowded and noisy exhibit hall, while walking, often one-handed.

- **How A (manual):** the user enters a current location (booth number, nearby vendor name, or a landmark such as "fountain") and a destination (vendor name or booth number), with fuzzy search (Elasticsearch planned). The user sets accessibility needs: wheelchair route, no stairs.
- **How B (Bluetooth):** the PWA asks for Bluetooth permission on open, positions the user via Bluetooth-to-GIS, the user picks a destination, and a "GO" button starts live turn-by-turn navigation that updates position until arrival.

## Capabilities and Constraints

- Proof of concept for the Cloud Native Hackathon (2026-11-09). Current scope: a pitch page with a small working demo map using sample floor-plan data.
- Not yet built: Elasticsearch search, Bluetooth positioning, live navigation, real venue data, shuttle legs.
- Server must keep listening on `$PORT` and keep `/healthz` and `/readyz`.

## Brand Commitments

Product name: **Lunzer**.

## Evidence on Hand

None. No real venue maps, users, metrics or testimonials exist; do not fabricate them. Demo data must be labeled as sample data.

## Product Principles

1. Fewer decisions per trip: the route is the answer, not the map.
2. Accessibility routes are first-class, not a filter afterthought.
3. Never route through walls or booths; never add redundant steps.
4. Show only what helps the user stay on route.

## Accessibility & Inclusion

Wheelchair and no-stairs routing is a core feature. The interface itself must meet WCAG 2.2 AA and work one-handed on a phone.
