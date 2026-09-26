# IBP method version comparison: Fr v3.0 (as implemented) vs FR v3.2

## Status

Reference document, phase 01.1 (reconcile the IBP method version).

## Date

2026-09-26

## Decision

The decision taken on the basis of this comparison is recorded in
[ADR-003 — IBP method version](adr-003-ibp-method-version-v1.md).

## Summary

**The app is not conformant with IBP FR v3.2.** The rules the app runs today (the API
`IbpRulesService`, the mobile `ibp-scoring.ts`, the form spec and the validation matrix) follow
IBP Fr v3.0. Compared with the official IBP FR v3.2 (CNPF / INRAE Dynafor, dated 02/02/2026),
v3.2 changes the scoring engine itself in **four places**: the native-cover cap sits on Factor A
(the app applies it to Factor B), the score-1 rule of C and D uses the sum of medium and large
deadwood, the score-1 rule of E uses the sum of large and very large trees, and the regional model
becomes four "cas" that select the A and G scales differently. v3.2 also changes what the observer
counts in about twenty places (strata heights, diameter classes, dendromicrohabitat groups, new
aquatic and rocky types, the Factor A genus list); the exact number is counted from the rows below
in [Summary counts](#summary-counts). The aggregation (A to G out of 35, H to J out of 15, total
out of 50), every count threshold, the G percentage bands and the interpretation chart are
unchanged. Several app bugs diverge from both versions and are listed separately, including the
0–50 total shown as "/10" on the home screen.

## Sources and baseline

| Source | Role | Identity | Pages cited |
|--------|------|----------|-------------|
| IBP FR v3.2, CNPF / INRAE Dynafor, 02/02/2026 | v3.2 side (authoritative) | `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf`, 28 pages, 1,264,005 bytes, SHA-256 `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`, retrieved 2026-09-26 | p. 2 (cas classification), p. 3–4 (definition sheet A to J), p. 5–9 (complements and FAQ), p. 10–11 (Tables 1 and 2), p. 12–13 (dendromicrohabitat typology), p. 14–15 (aquatic habitats), p. 16–17 (rocky habitats), p. 18–19 (survey instructions), p. 20–21 (survey sheet), p. 22–25 (stand description, results chart), p. 28 (authorship, mention of the previous version FR v3.0) |
| App implementation | v3.0 side (the baseline, see below) | `api/src/surveys/ibp-rules.service.ts`, `mobile/src/app/ibp-scoring.ts`, `mobile/src/app/vegetation.ts`, `mobile/src/i18n/fr/labels.ts`, `docs/specs/ibp-form-spec.md`, `docs/technical/ibp-validation-matrix-v1.md`, `api/test/ibp-rules.spec.ts` (18 tests), `mobile/src/app/ibp-scoring.test.ts` (4 tests), all read on 2026-09-26 | file and line references in the tables |
| CNPF "IBP Fr v3" survey sheets, dated 16/08/2021, sheet footer "version IBP Fr-ACA v3.210722" | Cross-check of the official v3 text (ACA sheet only) | `https://kebbe.iefc.net/wp-content/uploads/2022/03/Explication_general_IBP.pdf` (third-party mirror of a CNPF document), 8 pages, 724,689 bytes, SHA-256 `3751b6f6a0bfa68591a84fbbeb80aefc0eb004a90d8ff3cdaaff9a770b28b8e3`, retrieved 2026-09-26 | p. 3–4 (FAQ, linear-stand table), p. 7–8 (ACA survey sheet) |
| Official IBP Fr v3.0 PDFs dated 2023-03-23 | Not available | Both links in `docs/references/README.md` return HTTP 404 (checked 2026-09-26). The Wayback Machine has no snapshot of them, nor of CNPF's v2.9 to v3.0 change tables | none |

**Baseline used for the v3.0 column (D-02).** The official 2023-03-23 v3.0 documents are no longer
published and could not be recovered. The v3.0 column therefore describes **what the app and the
repository's spec and validation matrix implement**, which were transcribed from v3.0. This is the
baseline that matters: the question this document answers is "does the app match v3.2?", and the
app's own rules answer the v3.0 side. Where a cell was cross-checked against the official 2021
CNPF v3 ACA sheet, it says "2021 v3 sheet".

**Caveat on the 2021 v3 sheet.** It is the first v3 release (July 2021), not the 2023-03-23 update
the repository cites, and the mirror holds only the ACA sheet (the Mediterranean sheet is announced
in its table of contents but absent). Where the 2021 v3 sheet and v3.2 agree against the app, the
app is almost certainly wrong under v3.0 too. Where only the 2021 v3 sheet and v3.2 differ, the
2023 update may already have made the change, so those cells are labelled "2021 v3 sheet" and
never "v3.0 (2023)".

**Copyright (D-03).** Neither PDF is committed (`docs/references/README.md` forbids redistribution).
This document states facts in our own words; short French quotes appear only where the wording is
the point, each with its page.

### How to reproduce

1. Download `https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf`.
2. Run `sha256sum IBP_FR_v3_2_260202.pdf` and compare with
   `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`. A different hash means CNPF
   has changed the file and the page references may no longer hold.
3. Page numbers in this document are the **printed** page numbers ("IBP FR v3.2 (02/02/26) - p. N"
   in each page header). They match the physical page index of the PDF.
4. Optionally repeat the cross-check with the 2021 sheet mirror above (same `sha256sum` check).

## How to read the tables

Every difference is one row with seven columns:

| Column | Content |
|--------|---------|
| ID | Stable row identifier (CLS-, A-, B-, CD-, E-, F-, G-, H-, I-, J-, GS-), reused by ADR-003 and phase 01.8 |
| v3.0 / app | What the app, the form spec and the matrix do today; "2021 v3 sheet" marks a cross-check against the official 2021 sheet; "—" means v3.0 did not address the point |
| v3.2 (page) | What IBP FR v3.2 says, with its printed page |
| Severity | See the key below |
| API impact | What changes in `api/src/surveys/ibp-rules.service.ts` (line numbers as of 2026-09-26) or the DTOs |
| Mobile impact | What changes in `mobile/src/app/ibp-scoring.ts`, `vegetation.ts`, the form or the help text in `mobile/src/i18n/fr/labels.ts` |
| Matrix impact | Which case of `ibp-validation-matrix-v1.md` changes, or which new case is needed |

Severity key:

- **changes a score**: the scoring engine gives a different score for the same stored inputs.
- **changes a field**: what the observer counts or enters changes, so the score can change through
  the input, while the engine stays the same.
- **wording only**: a different wording, scope statement or source inconsistency with no effect on
  scoring.
- **none**: v3.2 says the same as the app; listed so the comparison is complete.

Unless a cell says otherwise, "l. N" in the API column refers to `ibp-rules.service.ts` and in the
mobile column to `ibp-scoring.ts`.

## Classification model (regions and stages vs cas 1 to 4)

The app, like v3.0, describes a survey's context with a biogeographic region (`region_version`,
ACA or M) and a vegetation stage (`vegetation_stage`). v3.2 replaces this with four "cas" defined by
growth constraints (p. 2):

- **Cas 1**: low to medium constraints. Temperate planitiaire, collinéen and montagnard stages and
  the **lower** subalpine, plus well-watered riparian forests and humid supra-Mediterranean zones
  inside the Mediterranean region.
- **Cas 3**: strong constraints from cold and a short growing season, i.e. the **middle and upper**
  subalpine.
- **Cas 4**: strong constraints from heat and summer drought, i.e. the thermo-, meso- and
  supra-Mediterranean stages, apart from the cas-1 exceptions.
- **Cas 2**: an overlay for very infertile stations in any climate, where trees cannot reach the
  very-large-tree diameter (67.5 cm in cas 1, 57.5 cm in cas 3 and 4) and heights generally stay
  at or under 12 m (cas 1) or 8 m (cas 3 and 4). v3.2 describes it as rare (p. 2, p. 5).

For Factors A and G, the cas-3 scales also apply to cas-2 stands located in cas-3 zones and to
forest habitats on lapiaz, dunes or peat bogs or dominated by *Juniperus thurifera* (footnote on
p. 4; stated generally on p. 7).

| ID | v3.0 / app | v3.2 (page) | Severity | API impact | Mobile impact | Matrix impact |
|----|------------|-------------|----------|------------|---------------|---------------|
| CLS-1 | Context is `region_version` (ACA or M) plus `vegetation_stage` (spec §5) | Context is a cas 1, 2, 3 or 4 box on the survey sheet (p. 20); the macroclimatic cas is read from thermotype and SER maps and confirmed in the field (p. 2, p. 5–6) | changes a field | `RegionVersion` type l. 26, `normalizeRegion` l. 443–448, `resolveThresholdRegion` l. 433–441, `region_version_required` l. 82–91; DTO enums in `survey-upsert.dto.ts` l. 61–63 and `survey-patch.dto.ts` l. 48–52 | `ibp-scoring.ts` l. 34–49 and 333–335; `vegetation.ts` l. 7–44; `types.ts` l. 95–103; `labels.ts` l. 6–18; `constants.ts` l. 33–34 | Contexts of MAT-A-01, MAT-A-02, MAT-G-01, MAT-SUBMIT-01 and MAT-SUBMIT-02 must be rewritten as a cas |
| CLS-2 | Any `subalpin` stage selects the subalpine A and G scales; diameters and strata follow ACA | Only the middle and upper subalpine is cas 3; the lower subalpine is cas 1 (p. 2, p. 6) | **changes a score** | `scoreFactorA` l. 228 and `scoreFactorG` l. 349 must select the scale by cas | l. 66 and l. 169 | MAT-A-02 becomes ambiguous: cas 3 keeps A = 2, lower subalpine (cas 1) gives A = 1 |
| CLS-3 | No fertility field (the 2021 v3 sheet had a fertile or very infertile box, which only changed the C, D and E diameters on the observer's side) | Cas 2 also changes the A genus list (supplementary genera), the B strata heights and the C, D and E diameter ranges (p. 3) | changes a field | A new cas input is needed (see ADR-003 change list) | New form input | New cases needed |
| CLS-4 | Not representable | Cas-3 A and G scales for cas-2 stands in cas-3 zones and for lapiaz, dune, peat-bog and *Juniperus thurifera* habitats (p. 4 footnote, p. 7) | **changes a score** | A and G scale selection l. 228 and l. 349 | l. 66 and l. 169 | New cases needed (MAT-A-05) |
| CLS-5 | 2021 v3 sheet: IBP is not meant for non-arborescent stages or agroforestry | Usable in scrub (fruticées) and in mixed wooded and open habitats such as orchards, wood-pastures and young natural regrowth, mainly when tree cover exceeds 10 % (p. 5) | wording only | none | none (possibly help text) | none |
| CLS-6 | `montagnard_mediterraneen` is normalised to ACA thresholds | No such stage; Mediterranean-boundary stands with stronger growth, riparian zones and the humid supra-Mediterranean fall in cas 1 (p. 2, p. 6) | changes a field | l. 437–439 become obsolete | `vegetation.ts` l. 39–41 | none |

**Mapping existing context values to a cas** (input for phase 01.8; one row rests on assumption
A3, see [Questions for CNPF and assumptions](#questions-for-cnpf-and-assumptions)):

| v3.0 `region_version` / `vegetation_stage` | v3.2 cas | Unambiguous? |
|--------------------------------------------|----------|--------------|
| ACA / planitiaire, collineen, montagnard | 1 | yes |
| ACA / subalpin | 1 (lower) or 3 (middle and upper) | no: the observer must say |
| ACA / montagnard_mediterraneen | 1 | assumed (A3); v3.2 names no such stage |
| M / thermo_mediterraneen, meso_mediterraneen | 4 | yes, unless riparian (then 1) |
| M / supra_mediterraneen | 4, or 1 if humid or riparian | mostly 4; flag for review |
| any stage on a very infertile station | 2 | not recorded today |

## Factor A — Native tree genera

| ID | v3.0 / app | v3.2 (page) | Severity | API impact | Mobile impact | Matrix impact |
|----|------------|-------------|----------|------------|---------------|---------------|
| A-1 | No cap on A; the app applies the "native cover under 50 %" cap to **B** instead (app bug under v3.0 too, see BUG-1) | A is capped at 2 when all native species cover less than 50 % of the described stand: « Score plafonné à 2 » (p. 3, p. 20). The 2021 v3 sheet also puts the cap on A (sheet p. 7) | **changes a score** | `scoreFactorA` l. 220–240 gains the cap and a native-cover input; `scoreFactorB` l. 257–259 loses it | `scoreFactorA` l. 58–78 and `scoreFactorB` l. 91–93; `labels.ts` l. 44–48 and l. 52; form fields `constants.ts` l. 40–41 and `useSurveyForm.ts` l. 149–158; `LEGACY_DEFAULT_FACTOR_VALUES` in `storage/db.ts` l. 39–41 | MAT-B-01 changes (B 2 becomes 5); new A-cap cases MAT-A-03 and MAT-A-04 |
| A-2 | App: no list, the observer types a count; 2021 v3 sheet (ACA): 25 genera plus the Quercus split | 28 genera plus the Quercus split, 29 countable taxa (p. 3); see the genus list below | changes a field | none (count only) | Help text `labels.ts` l. 45; phase 2 genus picker | none |
| A-3 | 2021 v3 sheet: only *Juniperus thurifera* | Genus Juniperus, restricted by Table 1 to *J. thurifera* plus *J. macrocarpa* and *J. phoenicea*, the last two in the coastal zone only (p. 3, p. 10, footnote p. 11) | changes a field | none | Help text; genus picker | none |
| A-4 | App and spec: "CNPF list for regional version", no list shipped; the v3.0 Mediterranean list could not be checked | Supplementary genera Ceratonia, Cercis, Olea, Phillyrea and Pistacia count in **cas 4 and cas 2** (p. 3); cas 2 includes very infertile temperate stations | changes a field | none (count only) | The genus picker must depend on the cas | none |
| A-5 | 2021 v3 sheet: nativity judged from the natural range (forest flora, atlas) | Species-level Table 1 (p. 10–11): tree species only (normally over 7 m as adults in closed forest), native where the survey is made. Archaeophytes count within their ancient range. All poplar cultivars count as native. Shrub species of a listed genus do not count (Table 2, p. 11) | changes a field | none | Help text; genus picker | none |
| A-6 | — | *Ficus carica* is in Table 1 (p. 10–11) but Ficus is not in the genus list (p. 3), and only listed genera count (p. 6); Ficus is therefore not counted | wording only | none | Genus picker must exclude Ficus; document it | none |
| A-7 | — | Pistacia is a supplementary genus (p. 3) but its native species appear only in Table 2 as shrubs, which are not counted (p. 11) | wording only | none | Genus picker decision in phase 2 | none |
| A-8 | Quercus split into deciduous and evergreen (2021 v3 sheet) | Same split, made explicit: evergreen includes the semi-evergreen *Q. suber*, deciduous includes marcescent oaks (p. 6) | wording only | none | none | none |
| A-9 | Scales: 0–1, 2, 3–4, 5 or more genera give 0, 1, 2, 5; subalpine: 0, 1, 2, 3 or more give 0, 1, 2, 5 | Same numbers; cas 1, cas 4 and cas 2 use the first scale, cas 3 the second (p. 3) | none | none | none | none |
| A-10 | Individuals count if living and over 50 cm tall, or dead | Same (p. 3) | none | none | none | none |

### Factor A genus list (v3.0 family vs v3.2)

**App list.** None. The app stores only `native_genus_count` and ships no genus list; the spec
refers to "the CNPF list for the regional version". A genus list exists only in the phase-1 spike
documentation (`species-recognition-spike-measurements-v1.md` §2), and it is derived from v3.2.

**2021 v3 sheet list (ACA sheet p. 7, French names mapped to genera).** Sorbus, Arbutus, Alnus,
Betula, Carpinus, Ostrya, Castanea, Quercus (deciduous), Quercus (evergreen), Picea, Acer,
Fraxinus, Juniperus (*J. thurifera* only), Fagus, Taxus, Prunus, Larix, Celtis, Juglans, Ulmus,
Populus, Pinus, Pyrus, Malus, Abies, Salix and Tilia: **25 genera plus the Quercus split, 27
countable taxa**. The 2021 Mediterranean sheet was not available.

**v3.2 list (p. 3, repeated on the survey sheet p. 20).**

- Main list, 28 genera: Abies, Acer, Alnus, Arbutus, Betula, Carpinus, Castanea, Celtis,
  Cupressus, Fagus, Fraxinus, Juglans, Juniperus, Larix, Malus, Ostrya, Pinus, Picea, Populus,
  Prunus, Pyrus, Quercus, Salix, Sorbus, Tamarix, Taxus, Tilia, Ulmus. Quercus counts twice
  (deciduous and evergreen), so the main list has **29 countable taxa**.
- Supplementary genera, counted in **cas 4 and cas 2** only: Ceratonia, Cercis, Olea, Phillyrea,
  Pistacia (5).
- Total: **33 genera, 34 countable taxa**, matching the 34 classes of ADR-002.
- Only listed genera count (p. 6).

| Genus | 2021 v3 sheet | v3.2 | Change |
|-------|---------------|------|--------|
| Abies, Acer, Alnus, Arbutus, Betula, Carpinus, Castanea, Celtis, Fagus, Fraxinus, Juglans, Larix, Malus, Ostrya, Picea, Pinus, Populus, Prunus, Pyrus, Salix, Sorbus, Taxus, Tilia, Ulmus (24) | listed | listed | none at genus level; Table 1 now restricts the species (for example Prunus is *P. avium* and *P. padus*; Salix is *S. alba*, *S. caprea* and *S. fragilis*) |
| Quercus deciduous and evergreen | listed | listed | wording only (A-8) |
| Juniperus | *J. thurifera* only | genus, with *J. thurifera* plus the coastal *J. macrocarpa* and *J. phoenicea* | **widened** (A-3) |
| Cupressus | absent | listed (*C. sempervirens*, an archaeophyte) | **added** |
| Tamarix | absent | listed (*Tamarix* spp.) | **added** |
| Ceratonia, Cercis, Olea, Phillyrea, Pistacia | not on the ACA sheet (Mediterranean sheet unavailable) | supplementary, cas 4 **and cas 2** | extended to temperate cas-2 stands; their v3.0 Mediterranean status is unverified (A-4) |
| Ficus | absent | in Table 1 but not in the genus list | not counted; question for CNPF (A-6) |

**Table 1 species per genus (v3.2, p. 10–11)**, for the phase 2 genus picker (Latin names only):

- Abies: *Abies alba*
- Acer: *A. campestre*, *A. monspessulanum*, *A. opalus*, *A. platanoides*, *A. pseudoplatanus*
- Alnus: *A. cordata*, *A. glutinosa*, *A. incana*
- Arbutus: *Arbutus unedo*
- Betula: *B. pendula*, *B. pubescens*
- Carpinus: *Carpinus betulus*
- Castanea: *Castanea sativa* (archaeophyte)
- Celtis: *Celtis australis*
- Ceratonia: *Ceratonia siliqua*
- Cercis: *Cercis siliquastrum*
- Cupressus: *Cupressus sempervirens* (archaeophyte)
- Fagus: *Fagus sylvatica*
- Ficus: *Ficus carica* (listed but not counted, see A-6)
- Fraxinus: *F. angustifolia*, *F. excelsior*, *F. ornus*
- Juglans: *Juglans regia* (archaeophyte)
- Juniperus: *J. macrocarpa* (coastal only), *J. phoenicea* (coastal only), *J. thurifera*
- Larix: *Larix decidua*
- Malus: *Malus sylvestris*
- Olea: *Olea europaea*
- Ostrya: *Ostrya carpinifolia*
- Phillyrea: *Phillyrea latifolia*
- Picea: *Picea abies*
- Pinus: *P. cembra*, *P. halepensis*, *P. mugo*, *P. nigra* subsp. *laricio*, *P. nigra* subsp.
  *salzmannii*, *P. pinaster*, *P. pinea* (archaeophyte), *P. sylvestris*, *P. uncinata*
- Populus: *P. alba*, *Populus* cultivars, *P. nigra*, *P. tremula*, *P. × canescens*
- Prunus: *P. avium*, *P. padus*
- Pyrus: *Pyrus communis* subsp. *pyraster*
- Quercus (deciduous): *Q. cerris*, *Q. petraea*, *Q. pubescens*, *Q. pyrenaica*, *Q. robur*
- Quercus (evergreen): *Q. ilex*, *Q. rotundifolia*, *Q. suber*
- Salix: *S. alba*, *S. caprea*, *S. fragilis*
- Sorbus: *S. aria*, *S. aucuparia*, *S. domestica*, *S. torminalis*
- Tamarix: *Tamarix* spp.
- Taxus: *Taxus baccata*
- Tilia: *T. cordata*, *T. platyphyllos*
- Ulmus: *U. glabra*, *U. laevis*, *U. minor*

**Table 2 (p. 11): shrubs that are never counted**, even when their genus is listed. It includes
among others *Alnus alnobetula*, *Buxus*, *Corylus avellana*, *Crataegus* spp., *Ilex aquifolium*,
*Juniperus communis*, *J. oxycedrus*, *Laurus nobilis*, *Pistacia lentiscus*, *P. terebinthus*,
*Prunus mahaleb*, *P. spinosa*, *Pyrus spinosa*, *Quercus coccifera*, *Salix atrocinerea*,
*S. cinerea*, *S. eleagnos* and *Sambucus nigra*. Phase 2 needs this list to exclude look-alike
species of counted genera.

## Factor B — Vertical vegetation structure

| ID | v3.0 / app | v3.2 (page) | Severity | API impact | Mobile impact | Matrix impact |
|----|------------|-------------|----------|------------|---------------|---------------|
| B-1 | B is capped at 2 when native cover is under 50 % (wrong under both versions, see BUG-1) | No cap on B; the cap belongs to A (p. 3) | **changes a score** | Remove the cap at l. 257–259 and the `covered_autochthonous_percent` requirement at l. 244–249 | l. 91–93 and l. 82–83; `labels.ts` l. 51–52; form field | **MAT-B-01: expected B = 5** (was 2) |
| B-2 | ACA strata: very low under 1.5 m, low 1.5–7 m, intermediate 7–20 m, high over 20 m (spec §6 B; 2021 v3 sheet p. 7 agrees) | Cas 1: under 1.5 m, 1.5–7 m, **7–18 m, over 18 m** (p. 3) | changes a field | none (count only) | Help text (`labels.ts` l. 49–53 gives no heights today); spec §6 B | none |
| B-3 | M strata: under 1.5 m, 1.5–5 m, 5–15 m, over 15 m (spec; the v3.0 M sheet could not be checked). ACA subalpine and very infertile stations used the ACA heights | Cas 2, 3 and 4: under 1.5 m, 1.5–5 m, **5–12 m, over 12 m** (p. 3) | changes a field | none | Help text; spec | none |
| B-4 | A stratum counts at 20 % cover or more; one woody plant can occupy several strata; 5 strata; 1, 2, 3–4, 5 strata give 0, 1, 2, 5 | Same (p. 3, p. 6–7); mosses are not counted (p. 7) | none | none | none | none |

## Factor C — Large standing deadwood

v3.2 states the deadwood rules once for both deadwood factors (standing wood for C, downed wood for
D), so rows CD-1 to CD-6 below apply to C and D alike. BMg is large deadwood, BMm medium deadwood,
both counted per hectare.

| ID | v3.0 / app | v3.2 (page) | Severity | API impact | Mobile impact | Matrix impact |
|----|------------|-------------|----------|------------|---------------|---------------|
| CD-1 | Score 0 when BMg/ha under 1 **and BMm/ha under 1**; score 1 when BMg/ha under 1 **and BMm/ha at 1 or more** (app l. 274–275; spec; 2021 v3 sheet p. 7 agrees) | Score 0 when BMg under 1/ha and **(BMm + BMg) under 1/ha**; score 1 when BMg under 1/ha and **(BMm + BMg) at 1/ha or more** (p. 3, p. 20) | **changes a score** | `scoreFactorCD` l. 274–275 | l. 106–107; `labels.ts` l. 57 and l. 62 | MAT-C-01 and MAT-D-01 unchanged; new case MAT-C-02 (BMg 1, BMm 1, 2 ha: v3.0 gives 0, v3.2 gives 1) |
| CD-2 | ACA: BMg diameter over 37.5 cm, BMm 17.5–37.5 cm (subalpine used ACA); M: BMg over 27.5 cm, BMm 17.5–27.5 cm | Cas 1: over 37.5 cm and 17.5–37.5 cm; **cas 3 and 4: over 27.5 cm and 17.5–27.5 cm** (p. 3) | changes a field | none | Help text; spec | none |
| CD-3 | Special cases (very infertile stations, slow-growing species): BMg over 17.5 cm; BMm range not redefined (2021 v3 sheet) | Cas 2 and slow-growing species: BMg over 17.5 cm, **BMm 7.5–17.5 cm** (p. 3) | changes a field | none | Help text; spec | none |
| CD-4 | Slow-growing species not listed | Listed in a footnote: *Acer monspessulanum*, *Alnus incana*, *Arbutus*, *Malus*, *Prunus padus*, *Pyrus*, and *Sorbus* other than *S. torminalis* and *S. domestica* (p. 4) | wording only | none | Help text | none |
| CD-5 | Standing wood at least 1 m high; downed wood at least 1 m long; diameter at 1.3 m (standing) or 1 m from the large end (downed). The 2021 v3 sheet FAQ counts the pieces of one tree once "unless decay stages clearly differ" | Same thresholds. A snag 1–1.3 m tall is measured at 1 m. A leaning dead tree whose branches touch the ground counts as downed. Pieces of one tree count once, with no decay-stage exception. Freshly felled trees awaiting removal are not counted (p. 7) | changes a field (minor) | none | Help text | none |
| CD-6 | Linear stands (under 15 m wide), per km: BMg/km under 9 and BMm/km under 9 give 0, and so on (spec §7) | Same linear table, still written with BMm alone (p. 6), inconsistent with CD-1; question for CNPF | wording only | none (linear stands not implemented) | none | none |

## Factor D — Large downed deadwood

Rows CD-1 to CD-6 in [Factor C](#factor-c--large-standing-deadwood) apply identically to D: the
same score-1 rule change (CD-1), the same diameter classes by cas (CD-2, CD-3), the same
slow-growing species list (CD-4) and the same linear-stand inconsistency (CD-6). They are not
repeated here.

D's own points are in CD-5: a downed piece counts from 1 m long, its diameter is measured 1 m from
the large end, and v3.2 adds that a leaning dead tree whose branches touch the ground is downed
wood (so it moves from C to D), and that the pieces of one fallen tree count once whatever their
decay stages (p. 7). These change what the observer counts, not the engine.

Matrix: MAT-D-01 (BMg 4, BMm 0, 1 ha, D = 5) gives the same result under v3.2. The CD-1 sum rule
does not affect it because BMg alone reaches the top class. The new case MAT-C-02 covers the sum
rule for both factors, since the API and the mobile app score C and D with the same function.
