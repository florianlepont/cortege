---
phase: 27-quick-survey-additions-inserted-v1
plan: 21
subsystem: verification
tags: [device-checks, weather, pdf, accessibility]
requires:
  - phase: 27-12
    provides: Météo-France provider
  - phase: 27-22
    provides: owner run and spike findings
provides:
  - "Rows DC-27-01 to DC-27-06 and finding F-27-1 in docs/user-tests/device-checks.md"
  - "Real Météo-France answer seen locally and on the production API"
key-decisions:
  - "2026-10-12 (owner: finalise the phase): the phase closes with the owner's iPhone Release passes; the emulator protocol (PDF page budget, small-screen keyboard, offline catch-up as a protocol, tap count, screen readers) is carried as open rows, not claimed as passed"
requirements-completed: [REQ-C-survey-note, REQ-C-factor-note, REQ-C-doubt-flag, REQ-C-weather-provider, REQ-C-weather-prefill, REQ-C-conditions-sync]
completed: 2026-10-12
---

# Plan 27-21: device checks and the real Météo-France answer

## What was done

- Gates on `main` at 24bf2111 (2026-10-12): `npm run lint`, `typecheck` OK; mobile unit 354 suites / 4947 tests; ibp-domain 269 tests at 100 % coverage; API unit 10 suites / 269 tests (the `check-env-parity` spec fails only on the Mac's bash 3.2, CI runs it); API e2e 44 of 46 suites (the two failures, `migrate-lock` and `list-pagination`, are the known local ones); `format:check` flags only the untracked local settings file.
- DC-27-06 closed: real Météo-France values seen on the simulator against the local API (2026-10-11) and on the owner's iPhone against the production API (2026-10-12, VPS runs the provider, the route answers 401 without a token).
- Owner passes on the iPhone (Release builds of PRs #281 to #285), quoted: "tout est bon" (2026-10-12): weather card and Conditions page, note above the keyboard, entrance, wording, IBP help removed.

## Not done (open, carried in device-checks.md)

DC-27-01 (PDF page budget, estimated 6 pages against 4, see F-27-1), DC-27-02 at 320 x 568 and 360 x 640, DC-27-03 as an airplane-mode protocol, DC-27-04 tap count, DC-27-05 VoiceOver / TalkBack / largest text. No screenshots or PDF page counts were produced, and `export-settings.ts` has no measurement line.
