# Reference material

The IBP methodology documents and the Etats Sauvages graphic charter are **not
redistributed in this repository**. They are third-party works and remain the
property of their respective authors.

## IBP methodology — CNPF / INRAE Dynafor

### Method version status

Implemented: v3.2 (v3.0 available per survey), since phase 01.8.

- **IBP FR v3.2 (02/02/2026)** is the default method for new surveys, adopted by
  [ADR-003](../technical/adr-003-ibp-method-version-v1.md). Its rules and test cases are in
  [`../technical/ibp-validation-matrix-v2.md`](../technical/ibp-validation-matrix-v2.md) and the
  form in [`../specs/ibp-form-spec.md`](../specs/ibp-form-spec.md). The API and the app both
  score through the shared package `packages/ibp-domain`.
- **IBP Fr v3.0** is still available per survey: the observer can choose it at creation, and every
  survey recorded before phase 01.8 (no stored method version) is v3.0. The app's v3.0 rules fix
  two transcription errors that are wrong under both versions (BUG-1: the native-cover cap is on
  Factor A; BUG-2: Factors G and H accept only 0, 2 or 5). The official v3.0 PDFs are no longer
  published by CNPF.
- The differences are listed factor by factor in
  [`../technical/ibp-version-comparison-v3.0-v3.2.md`](../technical/ibp-version-comparison-v3.0-v3.2.md).

### Documents

Authors: Gonin P., Larrieu L. (v3.0); Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S.,
Miozzo M., Palero N. (v3.2). © CNPF, INRAE Dynafor.
Official documents are published on the CNPF website:

- IBP home page (current documents): <https://www.cnpf.fr/ibp>
- IBP FR v3.2 (implemented, default method, ADR-003): definition and survey sheets, dated
  02/02/2026, 28 pp., also contains the survey instructions (p. 18-19):
  <https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf>
  (retrieved 2026-09-26, SHA-256
  `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`)
- IBP survey methods, "Méthodes de relevé de l'Indice de Biodiversité Potentielle (IBP)", dated
  09/09/25, 28 pp. (Gonin P., Larrieu L.): the current methods document that IBP FR v3.2 cites
  (p. 18) as "Gonin, Larrieu, 2025". It is the source of the route-choice and counting rules of
  [`../specs/route-choice-rules-v1.md`](../specs/route-choice-rules-v1.md) (Phase 30) and replaces
  the 2022 methods document below for this purpose:
  <https://www.cnpf.fr/sites/socle/files/2026-04/IBP_met_fr_250909.pdf>
  (retrieved 2026-10-13, SHA-256
  `3954746756b770f338055310973ada871ea5bdd768cb6be1ce60581a7a87d7f2`). Its tables 4, 5 and 7 are
  labelled "IBP v3.0" by the authors. Page numbers cited in the specs are the footers printed in
  the document ("Méthodes de relevé IBP (09/09/25) - p. N"). The PDF is not part of the repository.
- IBP Fr v3.0 (available per survey): definition, no longer online (HTTP 404, checked 2026-09-26);
  CNPF no longer publishes v3.0:
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/9a66d6016d0a99f576f35f53df4e73f3/ibp_def_fr_v3_0_230323_0.pdf>
- IBP Fr v3.0 (available per survey): survey sheets, no longer online (HTTP 404, checked
  2026-09-26); CNPF no longer publishes v3.0:
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/5cf710f876f8e4ddfd4007df318f71f5/ibp_rel_fr_v3_0_230323_0.pdf>
- IBP survey methods (2022-10-10), no longer online (HTTP 404, checked 2026-09-26); v3.2 now
  includes the survey instructions (p. 18-19):
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/e5f7f1ea0f6f4f63a2ef41a58ecab8e0/ibp_methodes_de_releve_v221010_0.pdf>

Cite as:

- Implemented, default method (ADR-003): Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S.,
  Miozzo M., Palero N., 2026 — *Indice de Biodiversité Potentielle pour les forêts de France
  métropolitaine (IBP FR v3.2) : définition et fiches de relevé*. CNPF, INRAE Dynafor, 02/02/26,
  28 p.
- Survey methods (route choice and counting, Phase 30): Gonin P., Larrieu L., 2025 - *Méthodes de
  relevé de l'Indice de Biodiversité Potentielle (IBP)*. CNPF, INRAE Dynafor, 09/09/25, 28 p.
- Method still available per survey: Gonin P., Larrieu L., 2022 — *Indice de Biodiversité
  Potentielle (IBP Fr v3.0)*. CNPF, INRAE Dynafor.

The scoring rules implemented in this app are derived from IBP FR v3.2, with IBP Fr v3.0 kept as a
per-survey choice. The factor-by-factor transcription used by the product lives in
[`../specs/ibp-form-spec.md`](../specs/ibp-form-spec.md) and
[`../technical/ibp-validation-matrix-v2.md`](../technical/ibp-validation-matrix-v2.md) (the
pre-01.8 baseline is [`../technical/ibp-validation-matrix-v1.md`](../technical/ibp-validation-matrix-v1.md)).

## Dendromicrohabitats: pocket guide and typology (Phase 32)

The detailed guide of factor F (dendromicrohabitats, DMH) is written from the documents below. None
of them is part of the repository.

### Documents

- Pocket guide, French edition (the reference edition): Bütler R., Lachat T., Krumm F., Kraus D.,
  Larrieu L. (2024), "Guide de poche des dendromicrohabitats. Description et seuils de grandeur
  pour leur inventaire dans les forêts tempérées et méditerranéennes", 2nd revised edition,
  Birmensdorf, Swiss Federal Institute for Forest, Snow and Landscape Research WSL, 64 pp.:
  <https://www.dora.lib4ri.ch/wsl/dload/wsl:37831/PDF/>
  (retrieved 2026-10-23, SHA-256
  `cc5fb0450b4dcf6c79b16e173fa7f28d5464035801b756b24950ba88e42a7e68`, 12,068,916 bytes, 64 pages).
  The fingerprint and the retrieval date come from the research of Phase 32
  (`32-RESEARCH.md`, "Sources and Licence"); no new download was made to write this record.
  Owner confirmation (D-01), 2026-10-24: edition confirmed by the owner, no file supplied; the
  2024 French edition read by the research is the reference. The 2020 first edition (47 types
  instead of 52) is not used.
- Pocket guide, English edition: "Field Guide to Tree-related Microhabitats", 2nd edition, 2024,
  64 pp.: <https://www.dora.lib4ri.ch/wsl/dload/wsl:36965/PDF/>
  (retrieved 2026-10-23, SHA-256
  `b4335f8dc93b4218aabe8bee91ee6336d2dca87e85e745f7c1a1ad8e232aa946`, same source of the
  fingerprint as above). Read to cross-check the French names; it is not the reference edition.
- Typology: Larrieu L., Paillet Y., Winter S., Bütler R., Kraus D., Krumm F., Lachat T., Michel
  A.K., Regnery B., Vandekerkhove K. (2018), "Tree related microhabitats in temperate and
  Mediterranean European forests: A hierarchical typology for inventory standardization",
  Ecological Indicators 84: 194-207, DOI `10.1016/j.ecolind.2017.08.051`. It is the source of the
  fifteen-group typology.
- Counting thresholds: the thresholds that the pocket guide shows (pages 3 and 12-13) are the ones
  of IBP FR v3.2, recorded in the entry "IBP FR v3.2 (02/02/2026)" of the section above.

Cite as:

- Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L., 2024 - *Guide de poche des
  dendromicrohabitats. Description et seuils de grandeur pour leur inventaire dans les forêts
  tempérées et méditerranéennes*. 2nd revised edition. WSL, Birmensdorf, 64 p.
- Bütler R., Lachat T., Krumm F., Kraus D., Larrieu L., 2024 - *Field Guide to Tree-related
  Microhabitats*. 2nd edition. WSL, Birmensdorf, 64 p.
- Larrieu L., Paillet Y., Winter S., et al., 2018 - Tree related microhabitats in temperate and
  Mediterranean European forests: a hierarchical typology for inventory standardization.
  *Ecological Indicators* 84: 194-207.

### Licence status (checked 2026-10-23)

- Pocket guide (both editions): the imprint carries only "© WSL 2024". No reuse licence appears in
  the PDF or on the publication page. The terms-of-use page of the publisher could not be read
  (HTTP 500 and 503 when checked). It is therefore treated as all rights reserved.
- Photos of the pocket guide (credits on page 64): Loïc Duchamp, Pierre Henrioux, Daniel Kraus,
  Thibault Lachat, Laurent Larrieu, Thomas Reich and Rita Bütler (all others). Drawings: Lisa
  Apfelbacher, Céline Emberger and Daniel Kraus. Their rights are not covered by any licence found.
- Larrieu et al. (2018): an Elsevier publication. Crossref lists only the publisher's text-mining
  user licence and no open licence.
- IBP FR v3.2: copyright of CNPF and INRAE Dynafor, as stated in the section above. The IBP logo is
  a registered trademark and is not used.

### Reuse in the app

- The texts of the in-app guide are the association's own wording, written from the facts (group
  and type names, thresholds) and citing the documents above on the in-app sources page (D-02,
  D-03).
- No text, photo or drawing of these documents is reproduced.
- The fifteen line drawings of the guide (one per IBP group) are original drawings made for the
  association and owned by it (D-09 and D-11, 2026-10-24). They are stored as vector path data in
  the app code, not as image files.
- The PDFs are not part of the repository (`*.pdf` is ignored in this directory). Download them
  from the links above if needed and check the SHA-256 values.

The correspondence of the IBP groups with the pocket guide's types and the texts of the in-app
guide are in [`../specs/dmh-guide-content-v1.md`](../specs/dmh-guide-content-v1.md), validated by
the owner on 2026-10-27, without a reading by an expert; that spec is the only source of the guide's
texts and numbers.

## Etats Sauvages graphic charter

The charter PDF is an internal document of the association and is not published
here. The implementation-ready rules extracted from it (palette, typography,
brand markers) live in
[`../design/charte-graphique-etats-sauvages-spec.md`](../design/charte-graphique-etats-sauvages-spec.md).

## Working locally

If you need the source PDFs, download the v3.2 PDF from the link above and keep it outside the
repository — `*.pdf` is gitignored in this directory. Check its SHA-256 against the value above.
The methods document (09/09/25) is downloaded and checked the same way.
The v3.0 PDFs can no longer be downloaded: CNPF no longer publishes them.
