# Phase 30: owner decisions at the validation gate (2026-10-13)

Source: the owner's answers in chat on 2026-10-13, recorded as given. These answers **supersede** the matching decisions of `30-CONTEXT.md` (D-02, D-03, D-04, D-06) and the defaults of `docs/specs/route-choice-rules-v1.md` section 11. They are structural, so the plans are revised (plan 30-02 returns "PHASE REPLAN NEEDED" until the revised spec is re-read and validated).

## Decisions

| Id | Owner answer (as given) | Consequence |
|---|---|---|
| O-14 (and the typological and systematic parcours) | "retire les parcours typologiques et systémiques de l'application. Ils ne sont pas utilisés pour nos usages." | The app has only two parcours: **parcours en plein** and **parcours partiel**, plus the helper "Découper en sous-peuplements". No group of placettes, no pooled calculation, **no Phase 30.1**, no `group_name`, no `sample_total_ha`, no `typological` or `systematic` method values. O-06, O-08, O-16, O-17, U-O6, U-O8 and the group ambiguities G-1..G-11 become moot (kept in the spec only as a note that they were dropped). D-02, D-03, D-04 are superseded. |
| O-01 / U-O12 | Par facteur, avec préréglages | Record `counting` and `uncapped_factors`; five presets and one chip per factor, as in the spec. |
| O-02 | 10 ha varié / 20 ha homogène | As the spec default. |
| O-03 / U-O5 | Découper en sous-peuplements | Preselected and labelled "Conseillé"; above the limit the options are now only "Découper en sous-peuplements" and "Parcours partiel" (typologique is gone). |
| O-04 / U-O4 | "Oui, ils déplacent la proposition" (temps et expérience) ; débutant "x 2" | Time and experience are rules, not advice. Two experience levels: "Habitué à l'IBP" and "Je débute". Estimated duration of a parcours en plein = surface x 15 to 20 min per hectare (25 to 30 in difficult terrain, CNPF S p. 19, M p. 17), doubled for a beginner (the factor 2 is an application choice, not a CNPF figure). If the observer's available time is below the estimate, the app proposes the parcours partiel. Which end of the CNPF range is compared (the upper bound is proposed, being the cautious one) is flagged for the owner at the final reading. |
| O-07 / route mandatory | "mais le choix du parcours devrait être obligatoire ? sinon je vois pas comment l'IBP peut se calculer" then "Obligatoire dès la création" | The route is **mandatory from the creation** of a survey: the guide step is no longer skippable (D-06 and U-O2 superseded); a quick path remains ("Je connais déjà mon parcours" opens the chooser). The score itself does not depend on the route (it is computed from the counts and percentages entered), which the spec states. Surveys that exist already: drafts without a route must get one before submit; submitted surveys stay "Parcours : non renseigné" (to confirm at the final reading). API: a new survey cannot be created or submitted without a route from the new client. |
| O-09 | Oui, v3.0 et v3.2 | As the spec default. |
| Objective question ("étude ou inventaire") | The owner did not understand the question ("Je comprends pas la question") | Proposed resolution, to be confirmed at the final reading: the objective question is removed (it only led to the complete counting preset). The complete counting stays a manual choice (presets and chips). U-O3 is moot. |
| O-12 / U-O1 | Parcours / Comptage rapide ou complet | As the spec default. |
| O-15 / U-O15 | Oui | Route shown read-only on another member's survey. |
| O-10 | First "Les prendre en charge", then after the consequences were explained: "Hors champ, finalement" | Linear stands under 15 m are out of scope: no question, no code, one fixed help sentence under the surface question. |
| O-13 | 3 à 5 testeurs | As the spec default. |
| O-05, O-11 | Oui, 5 ha et avertissement sous 0,5 ha | As the spec default. |
| U-O9, U-O10, U-O11, U-O14 | Oui, garder ces quatre défauts | As the spec default. |
| U-O13 | Not asked (default) | Wording review in plan 30-22 stays. |

## What remains for the owner
Re-read the revised spec and confirm, in writing with the date, section 13 of `docs/specs/route-choice-rules-v1.md`, including the two points marked as proposed above (objective question removed; upper end of the CNPF duration range). Only then do the code plans start.
