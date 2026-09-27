# ADR-004 - Hosting and Infrastructure Target

## Status
Accepted

## Date
2026-09-27

## Context

ADR-001 explicitly left "Final cloud provider selection" out of scope and recorded Scaleway only
as "a valid option" with tradeoffs still to evaluate. In the meantime, `docs/project/presentation-association.md`
committed to a different, unratified target in a stakeholder-facing document: alwaysdata (Paris,
Small plan, ~72 €/yr) for the server and PostgreSQL, and Cloudflare R2 for photo storage, with a
budget approval requested on that basis. That plan was never implemented.

The infrastructure that is actually running today is different again, and was built and documented
incrementally in `infra/vps/README.md` without ever being ratified as a decision:

- A VPS (`cortege.algernon.ovh` / `cortege-files.algernon.ovh`) the project already pays for and
  shares with other projects, replacing an earlier Freebox (home-connection) deployment that was
  retired because its self-hosted CI runner became unsafe once the repository went public, and
  because a residential connection with a dynamic address was never a sound production target.
- **Docker Compose** running PostgreSQL 16, a MinIO-compatible object store, and the API image,
  each with memory limits sized for a shared host (`infra/docker-compose.vps.yml`).
- **Caddy**, already running on the host for other projects, as the single entry point on 80/443;
  the stack itself publishes only on the loopback.
- **GHCR** (`ghcr.io/florianlepont/cortege`) as the image registry, built by `ci.yml` on every
  `main` push that touches `api/**` or `packages/**`.
- A **systemd timer** (`cortege-deploy.timer`/`.service`) polling the registry every 5 minutes and
  running `infra/vps/update-stack.sh`, which fast-forwards the git checkout, pulls the new image,
  runs the production configuration check, and only then restarts the stack. This is a pull-based
  deployment: nothing is stored on GitHub, no SSH key or deployment token is needed, and the VPS
  needs no inbound access beyond what Caddy already serves.
- **MinIO** (`pgsty/minio`, pinned by digest — the upstream `minio/minio` image is no longer
  published) as the S3-compatible object store for attachments and profile pictures, reachable
  through the host Caddy under `cortege-files.algernon.ovh` because attachment URLs are presigned
  and the signature covers the `Host` header.

This stack has been running in production, serving real field surveys, since the Freebox
migration. Nobody has acted on the alwaysdata + Cloudflare R2 plan, and there is no budget,
account, or migration work pending against it. Deciding between the two is not a live question:
one of them is a paper plan that was never executed, and the other has already absorbed the
operational cost of getting a working deployment (registry auth, presigned URLs signed against the
right hostname, MinIO image continuity, non-root container, pull-based updates with a
configuration guard). Re-litigating the choice and migrating to alwaysdata + R2 would mean
throwing that away for no operational gain, and would leave the object storage migration
(local-disk MinIO objects to R2) as unfunded, unscoped work with no owner.

## Decision

**The hosting and infrastructure target is the VPS stack already running in production:**

- **Compute**: a VPS running Docker Compose (`infra/docker-compose.vps.yml`).
- **Reverse proxy / TLS**: the host's Caddy instance, serving `cortege.algernon.ovh` (API) and
  `cortege-files.algernon.ovh` (object storage), per `infra/vps/Caddyfile.snippet`.
- **Database**: PostgreSQL 16 in a Compose service, with the durability program of Phase 11
  (scheduled backups, a documented and rehearsed restore, and hardened migrations) as the thing
  that takes it out of the "PoC fonctionnel" status noted in the presentation document.
- **Object storage**: MinIO (`pgsty/minio`, pinned by digest), S3-compatible, reachable at
  `OBJECT_STORAGE_ENDPOINT=https://cortege-files.algernon.ovh`.
  A managed S3-compatible provider (Scaleway Object Storage, AWS S3) stays a valid future upgrade
  — the API's storage layer is already provider-agnostic (`api/src/storage/storage.service.ts`,
  `OBJECT_STORAGE_MODE=local|minio` plus standard S3 env vars) — but is not needed today and is
  not part of this decision.
- **Registry**: GHCR (`ghcr.io/florianlepont/cortege`), built by CI on `main`.
- **Deployment**: pull-based, via a systemd timer running `infra/vps/update-stack.sh`, which
  guards every restart behind the production configuration check (`api/dist/config/check-config.js`)
  so a bad environment file cannot take the API down.

This **supersedes** the alwaysdata + Cloudflare R2 note in
`docs/project/presentation-association.md`. That document is a stakeholder-facing presentation,
not a technical specification; it is updated separately to point at the actual running
infrastructure (see Consequences) rather than treated as a competing decision. This ADR closes
`INGEST-CONFLICTS.md` warning 7.

This is a ratification of the status quo, **not a migration**: no infrastructure changes as a
result of this ADR. The concrete durability work it unblocks (backups, restore rehearsal, migration
hardening) is tracked as Phase 11 of the roadmap and is documented independently in
`infra/vps/README.md`.

## Why this choice

- **It is already running, already paid for, and already proven**: real field surveys sync through
  it today. Switching hosts is a project of its own, with real risk (data migration, DNS cutover,
  re-signing every presigned URL scheme, re-provisioning MinIO buckets), for a stack that has no
  demonstrated deficiency serious enough to justify that cost.
- **Docker Compose** keeps the three services (Postgres, MinIO, API) declarative, reproducible
  between local dev (`infra/docker-compose.yml`) and production (`infra/docker-compose.vps.yml`),
  and easy to reason about on a single shared host.
- **Caddy** was already running on the host for other projects; reusing it avoids a second
  TLS-terminating proxy and a second certificate-renewal process to operate.
- **GHCR** is free for a public repository, integrates with the existing GitHub Actions CI without
  new credentials, and needs no separate registry account or billing relationship.
- **A pull-based systemd timer** needs no inbound access to the VPS and no secret stored on
  GitHub (no SSH key, no deployment token) — the attack surface of a push-based deploy (a
  compromised CI job with SSH access to production) does not exist here.
- **MinIO, pinned by digest**, gives an S3-compatible API without a third-party storage bill, while
  keeping the storage layer abstract enough (`OBJECT_STORAGE_MODE`) that a managed provider is a
  configuration change, not a rewrite, if the project's storage or bandwidth needs later outgrow a
  self-hosted volume.

## Consequences

- `docs/project/presentation-association.md` is corrected in the same change as this ADR to
  describe the VPS + Caddy + MinIO stack instead of alwaysdata + Cloudflare R2, so the
  stakeholder-facing document and the technical decision stop disagreeing.
- The durability gaps the presentation document flagged for the database ("PoC fonctionnel —
  déploiement sur solution pérenne à faire") are closed by the rest of Phase 11 (scheduled
  backups with a rehearsed restore, and migrations that cannot half-apply), not by a different
  hosting provider.
- Because the VPS is shared with other projects, the Compose services carry explicit memory limits
  (`infra/docker-compose.vps.yml`) and the operational discipline in `infra/vps/README.md`
  (rollback via tagged images, MinIO volume backup before an image change, the `xid8` fix-up after
  a logical restore) is the project's baseline, not a temporary workaround.
- A future move to a managed database or object-storage provider remains possible without
  re-litigating this ADR, as long as it does not silently replace this decision the way the
  alwaysdata + R2 note did: it would get its own ADR that explicitly supersedes this one.
- No code, infrastructure file, or environment variable changes as a result of this ADR alone.

## Out of Scope for This Decision

- Migrating away from the current VPS, Caddy, GHCR, or MinIO.
- Selecting a managed PostgreSQL or S3-compatible provider (Scaleway remains a valid option per
  ADR-001 if the self-hosted stack is ever outgrown).
- Multi-region or high-availability hosting.

## Expected Validation

- [x] `docs/project/presentation-association.md` no longer references alwaysdata or Cloudflare R2
  as the hosting target.
- [x] `INGEST-CONFLICTS.md` warning 7 is marked resolved by this ADR.
- [x] `docs/README.md` links this ADR from the documentation index.
