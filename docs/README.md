# Documentation Map

The repository documentation is grouped under `docs/`:

- `docs/specs/`
  Product and functional specifications.
  Includes the epic files plus support documents such as `ibp-form-spec.md` and `user-stories.md`.

- `docs/technical/`
  Technical contracts, ADRs, validation rules, architecture and sync behavior.
  The IBP method version decision is [ADR-003](technical/adr-003-ibp-method-version-v1.md), based on the factor-by-factor [v3.0/v3.2 comparison](technical/ibp-version-comparison-v3.0-v3.2.md). Since phase 01.8 the app implements IBP FR v3.2, with IBP Fr v3.0 available per survey (`ibp_method_version`, null = v3.0; migration 016).
  The hosting and infrastructure target is ratified in [ADR-004](technical/adr-004-hosting-and-infrastructure-v1.md): Docker + Caddy + GHCR + a systemd timer + MinIO on the VPS (`infra/vps/README.md`), superseding the unratified alwaysdata + Cloudflare R2 note in `docs/project/presentation-association.md`.
  The scoring rules and their test cases are in [ibp-validation-matrix-v2.md](technical/ibp-validation-matrix-v2.md) (the pre-01.8 baseline is [ibp-validation-matrix-v1.md](technical/ibp-validation-matrix-v1.md)). Its executable form is the parity fixture of the shared package `packages/ibp-domain`, which the API and the app both use; see block 8 of [technical-architecture-v1.md](technical/technical-architecture-v1.md).

- `docs/design/`
  Design and brand-system documents.
  The latest UX/UI audit (findings, motion system, roadmap) is [ux-ui-audit-2026-09.md](design/ux-ui-audit-2026-09.md).

- `docs/references/`
  Links to third-party reference material (CNPF IBP methodology, brand charter).
  The source PDFs are not redistributed here — see `docs/references/README.md`.