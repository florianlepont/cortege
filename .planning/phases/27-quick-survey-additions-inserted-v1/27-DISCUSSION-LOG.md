# Phase 27: Quick survey additions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-10-11
**Phase:** 27-quick-survey-additions-inserted-v1
**Areas discussed:** Storage and sync, Free note, Weather, Certainty, Entry ergonomics

---

## Storage and sync
Chosen: dedicated columns (migration 023); everything read-only after submit (the owner first picked "note editable, weather and certainty frozen", then reversed: the note is not editable after submit); optional fields, null = absent. Rejected: JSON-only storage (409 risk on same-version compare), separate table.

## Free note
Chosen: one note per survey and one per factor; 1000 characters, visible to members; searchable in the global search for own surveys only. Rejected: survey note only, owner-only visibility, no search.

## Weather
Chosen: Météo-France official API (owner overrode the Open-Meteo recommendation), proxied by the Cortege API; sky, temperature, wind, rain 24 h; filled when the parcel is chosen at its centre; empty offline then catch-up. Rejected: Open-Meteo, direct phone calls, button-triggered fill.

## Certainty
Chosen: per factor A to J; Sûr / Douteux; shown in detail, score page, PDF and to other members; kept out of the scoring code with a parity case. Rejected: per genus, three levels, per survey, owner-only.

## Entry ergonomics
Chosen: "Conditions" section in the context screen; collapsed strip under each factor; factor note 300 characters; summary line plus score page badges plus PDF block.

## Claude's Discretion
Visual design, sky labels, cache and throttle, payload key names.

## Deferred Ideas
Per-genus doubt, three-level scale, editable note after submit, community note search, doubt reason text.
