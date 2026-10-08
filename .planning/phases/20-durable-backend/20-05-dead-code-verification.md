# Phase 11: Dead Code Verification (REQ-INF-deadcode)

**No new work in this phase.** `api/src/users/email.service.ts` and the `SMTP_*` environment
variables were already fully removed in phase 01.9 (D-09), before Phase 11 started. This note
records the verification performed at the start of Phase 11, so the requirement's checkbox has a
recorded basis rather than being marked done on assumption.

## What was checked (2026-09-27)

```
$ find . -iname "email.service*" -not -path "*/node_modules/*"
(no output)

$ grep -rn "SMTP_" --include="*.ts" --include="*.example" --include="*.env*" --include="*.md" . \
    | grep -v node_modules
CLAUDE.md
.planning/PROJECT.md
.planning/phases/**/*.md   (historical planning docs referencing the phase 01.9 removal)
api/test/env.schema.spec.ts        (asserts SMTP_* is NOT in the schema)
api/test/check-env-parity.spec.ts  (asserts SMTP_* is NOT accepted)

$ grep -n "SMTP" api/.env.example
(no output, exit 1)

$ grep -rn "SMTP\|EmailService" api/src/
(no output)
```

- `infra/vps/check-env.sh` already lists all seven `SMTP_*` variables plus
  `EMAIL_CHANGE_CONFIRM_URL_TEMPLATE` under "Variables supprimées en phase 01.9 (D-09)" and reports
  any leftover line in a deployment env file as `INFO: ... ligne inutile, peut être supprimée.`
- `CLAUDE.md` already documents: "The API sends no email: the SMTP settings and `EmailService`
  were removed (phase 01.9). Do not re-add them; `infra/vps/check-env.sh` reports leftover `SMTP_*`
  lines as obsolete."
- `infra/vps/env.example` (the deployment env template) has no `SMTP_*` lines.

## Conclusion

REQ-INF-deadcode's two conditions (`email.service.ts` gone from the repo; `SMTP_*` gone from the
repo, `api/.env.example`, and the deployment env) are both true, and have been true since phase
01.9. This phase makes no change for this requirement beyond recording the verification above.
