---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 15
subsystem: pdf-export
tags: [owner-review, iphone, device-checks]
requirements-completed: [REQ-C-pdf-two-versions, REQ-C-pdf-summary-page, REQ-C-pdf-modern-layout, REQ-C-pdf-lean-export, REQ-C-pdf-commune-row]
completed: 2026-10-26
---

# Phase 33 Plan 15: Owner review on the iPhone

The owner reviewed both PDF versions on their iPhone (iPhone 15 Pro, Release builds of the phase branch) in three rounds on 2026-10-26, and validated the last one. No code changed in this plan; the corrections of the first two rounds are plans 33-17 to 33-20.

## Rounds

| Round | Build | Owner's answer | Closed by |
|---|---|---|---|
| 1 | bece9af1 | Sheet: title too close to the edges, "Annuler" not needed, sheet too tall. PDF: show the full parcel list, put the location (the parcel map) on the first page, date and year are a doublon, make the factor chart tell stand from context. Everything else validated; sizes, the four defaults and the other points ok | 33-17 (sheet, chart groups, parcels, year), 33-18 (map on the cover) |
| 2 | 4f0e319a | "Je valide l'ensemble", one remark: come closer to the CNPF method's charts (the context-against-stand plane and the ten-axis rose) | 33-19, 33-20 |
| 3 | 71420e0b | "Je valide, tu peux clôturer" | none, phase closed |

Between round 1 and 2 the owner also took three decisions before the build (plan 33-16): photos 640 px / 0.6, fill factor 0.94 (the v3.2 sheet without map or history is back to 4 pages), a lighter summary basemap.

## Gap list

| Gap (D-01 to D-04 and what the owner added) | Closed by | Owner verdict |
|---|---|---|
| Not modern enough: graphics, cover, typography and colours | 33-06, 33-07, 33-10, 33-19 | closed |
| Fewer pages, cleaner page breaks | 33-08, 33-13, 33-16, 33-18 | closed |
| A lighter file | 33-08, 33-16 | closed ("taille ok") |
| Cadastre rows merged into one Commune row | 33-04 | closed |
| Full parcel list, no "..." | 33-17 | closed |
| Location on the first page | 33-18 (map on the cover) | closed |
| Date and observation year doublon | 33-17 | closed |
| Stand against context in the chart, like the CNPF method | 33-17, 33-19 | closed |

## Verdicts on the defaults and open choices

| Item | Verdict |
|---|---|
| D-15 "Partager" label, D-16 "77186 (département 77)", D-17 photo settings, D-18 quiet summary panel | ok ("les 4 valeurs sont ok") |
| U-01 header without the small logo, U-10 summary map and trend sizes, U-11 cover facts and white space (the facts then left the cover, D-24) | ok |
| Sheet height, page estimate | ok after the fitted-height change |
| Summary above 200 KB on Android (225 KB), complete PDF weights | accepted ("taille ok") |
| Rings at 0, 2, 5 and the rose in the app's colours (round 3 defaults) | validated as built |

## Not itemised or not measured

- The owner's verdict on the draft and dark-mode steps was a blanket "tout le reste est validé" (DV-33-04, DV-33-05).
- Real-phone measurements of page counts, sizes and engine rendering were never taken: all numbers are from Chrome, the iOS simulator and the Android emulator (DC-33-01 to DC-33-05). The owner's iPhone confirmed the look, not the numbers.
- Sheet scrolling at the largest text size, the 30-parcel documents on a device, the offline snapshot branch and phone-photo sources were not tested on a device.
- Nothing was pushed or merged.

## Rows

`docs/user-tests/device-checks.md`: DV-33-01 to DV-33-15 with the owner's words and the build commit (DV-33-10 superseded by DV-33-12 to DV-33-14).
