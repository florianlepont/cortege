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
- Condition 1: an edited weather reads "Préremplie d'après Météo-France, modifiée par ..." and the
  PDF names the observer's edit (the mixed case is tightened below).
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
  - Strict rule for a mixed weather (owner decision, 2026-10-12): source Météo-France, at least one
    value edited and at least one still the provider's. The source line then reads "Source :
    Météo-France, mesure du 12/10/2026 à 04:00, certaines valeurs modifiées par l'observateur"
    (undated: "Source : Météo-France, certaines valeurs modifiées par l'observateur") on the summary
    card, the Conditions section source line, the read-only view and the PDF source cell ("Météo-France,
    mesure du ..., certaines valeurs modifiées par l'observateur"). Nothing edited: the line is
    unchanged. Every provider value edited: no attribution line, the existing "modifiée par
    l'observateur" wording applies. `weatherSourceLine` owns the rule; the PDF and the read-only view
    follow it.
  - Pure helpers next to `formatObservationTime` in `mobile/src/app/weather.ts`:
    `formatObservationDate`, `observationStamp`, `weatherSourceLine`. Strings in
    `mobile/src/i18n/fr/conditions.ts` and `survey-export.ts`. No change to the stored payload or to
    any API.
- Docs: quota and terms recorded in `api/test/fixtures/meteofrance/README.md` and in the weather
  paragraph of `docs/technical/api-contract-v1.md`; D-31 added to `27-CONTEXT.md`; open question O6
  closed in `27-RESEARCH.md`; one line in `CLAUDE.md`.

## Points left for the owner

- The date is the `observed_at` stored in the survey. If the observer retyped the observation time,
  the stored instant is theirs, not the station's.
