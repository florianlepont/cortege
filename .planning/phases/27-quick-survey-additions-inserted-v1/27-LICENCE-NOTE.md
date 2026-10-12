# Phase 27: Météo-France licence note (2026-10-12, decision D-31)

The owner read the licence of the Données d'observation API of Météo-France and the Licence Ouverte
Etalab 2.0, and accepted them. This note records what they require and where the app stands.

## What the licence requires

Reuse is free, commercial use included, in apps and in documents shared with partners (survey PDFs),
on four conditions:

1. No alteration of the data and no distortion of its meaning.
2. The mention that the data come from Météo-France, on every support.
3. The **date of the last update** of the reused data, next to that mention.
4. The reuser keeps the data up to date.

Also stated: the documented retention of past observations is 24 hours; Météo-France may change or
withdraw data and quotas without notice and guarantees no availability; the key must never be
disclosed. Quota reported by the owner: 100 requests per minute (per API, per account).

## Already satisfied before this change

- Condition 2: "Source : Météo-France" on the summary card, the Conditions section, the read-only
  view and the PDF (D-26), shown only while at least one shown value is still the provider's
  (`showsProviderAttribution`); manual values carry no Météo-France mention.
- Condition 1 (partly): an edited weather reads "Préremplie d'après Météo-France, modifiée par ..."
  and the PDF names the observer's edit.
- 24 hour window (D-20, D-28), so the app never relies on the undocumented 96 hours.
- The key stays server side (`METEOFRANCE_API_KEY`, `apikey` header from the API only).
- Condition 4: values are fetched fresh at parcel choice and caught up within 24 hours; a stored
  weather is the measurement at the survey time, not a live feed.

## What changed

- Condition 3: the date and time of the measurement now appear wherever the source is shown, read
  from `weather.observed_at` on the phone's local clock: "Source : Météo-France, mesure du
  12/10/2026 à 04:00". Without a readable `observed_at` the line stays "Source : Météo-France".
  - Summary card source line (`ConditionsCard`), status line and source line of the Conditions
    section (`WeatherBlock`), read-only twin (`ConditionsReadOnly`), PDF conditions block
    (`conditions-section.ts`).
  - Edited weather keeps its wording and gains the date: "Préremplie d'après Météo-France, mesure
    du 12/10/2026 à 04:00, modifiée par vous / par l'observateur" (PDF: "Météo-France, mesure du
    ..., modifiée par l'observateur").
  - Pure helpers next to `formatObservationTime` in `mobile/src/app/weather.ts`:
    `formatObservationDate`, `observationStamp`, `weatherSourceLine`. Strings in
    `mobile/src/i18n/fr/conditions.ts` and `survey-export.ts`. No change to the stored payload or to
    any API.
- Docs: quota and terms recorded in `api/test/fixtures/meteofrance/README.md` and in the weather
  paragraph of `docs/technical/api-contract-v1.md`; D-31 added to `27-CONTEXT.md`; open question O6
  closed in `27-RESEARCH.md`; one line in `CLAUDE.md`.

## Points left for the owner

- On the summary card and in the PDF, a weather where only some values were edited still reads
  "Source : Météo-France, mesure du ..." beside the mixed values (the D-26 rule, kept as asked). The
  Conditions section status line says "modifiée par vous" in that case. If strict condition 1
  wording is wanted on the card too, a "valeurs modifiées" suffix is a one-string change.
- The date is the `observed_at` stored in the survey. If the observer retyped the observation time,
  the stored instant is theirs, not the station's.
