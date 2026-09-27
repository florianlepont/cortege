---
phase: 11-durable-backend
plan: 01
subsystem: docs
tags: [adr, hosting, documentation]

requires: []
provides:
  - "docs/technical/adr-004-hosting-and-infrastructure-v1.md: accepted ADR ratifying the VPS stack"
  - "docs/project/presentation-association.md corrected to match the ratified decision"
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - docs/technical/adr-004-hosting-and-infrastructure-v1.md
  modified:
    - docs/project/presentation-association.md
    - docs/README.md

key-decisions:
  - "ADR-004 ratifies the status quo (Docker + Caddy + GHCR + systemd timer + MinIO); no infrastructure changed as a result"
  - "The stakeholder presentation is corrected in the same change rather than left disagreeing with the ratified decision"
  - ".planning/INGEST-CONFLICTS.md itself is left as a historical generated snapshot; warning 7's resolution is recorded by REQUIREMENTS.md's own checkbox, matching how other resolved warnings in that file are handled"

requirements-completed: [REQ-INF-hosting-adr]

duration: ~25min
completed: 2026-09-27
---

# Phase 11 Plan 01: Hosting ADR Summary

**ADR-004 ratifies the VPS stack (Docker Compose + Caddy + GHCR + a pull-based systemd timer with
a configuration guard + MinIO pinned by digest) as the hosting target, explicitly superseding the
unratified alwaysdata + Cloudflare R2 note from `docs/project/presentation-association.md`. This
closes `INGEST-CONFLICTS.md` warning 7.**

## What was found before writing anything

`docs/project/presentation-association.md` (a May 2026 stakeholder budget presentation) commits to
alwaysdata (Paris, ~72 €/yr) for the server and database, and Cloudflare R2 for photo storage. That
plan was never executed. The infrastructure that has actually been running in production since the
Freebox migration is different: a VPS (`cortege.algernon.ovh` / `cortege-files.algernon.ovh`)
already shared with other association projects, Docker Compose, the host's existing Caddy instance,
GHCR as the image registry, a pull-based systemd timer (`cortege-deploy.timer`) guarded by a
production configuration check, and MinIO (`pgsty/minio`, pinned by digest) for object storage.
ADR-001 had explicitly left "final cloud provider selection" out of scope, so nothing was
technically LOCKED — but the actual, working, revenue-serving choice was never written down as a
decision, only as incremental `infra/vps/README.md` operational notes.

## What changed

- New `docs/technical/adr-004-hosting-and-infrastructure-v1.md`: Accepted, dated 2026-09-27,
  follows the ADR-001 template. States plainly this is a ratification of what is already running,
  not a migration — no code or infra changed as a result of this ADR by itself. Names the concrete
  durability gaps this phase's other plans close (backups, migration hardening) as the answer to
  the presentation document's own "PoC fonctionnel" flag on the database, rather than a different
  hosting provider.
- `docs/project/presentation-association.md`: the annual budget table, the "Où sont hébergées les
  données" (GDPR) section, the "Le serveur" technical blurb, and the tooling-access ask list are
  all corrected to describe the VPS + Caddy + MinIO stack instead of alwaysdata + Cloudflare R2. A
  dated addendum line at the bottom records the correction and points at ADR-004, following the
  same inline-update convention ADR-001 itself uses for its 2026-04-06 Auth0 addendum.
- `docs/README.md`: one new line pointing at ADR-004, next to the existing ADR-003 line.

## Verification

- `grep -n "alwaysdata\|Cloudflare R2" docs/project/presentation-association.md` returns only the
  addendum note explaining the correction — no remaining line presents either as the current plan.
- `grep "adr-004" docs/README.md` finds the new index line.
- No code, `api/`, `mobile/`, `infra/*.yml` or `infra/vps/*.sh` file changed in this plan.
