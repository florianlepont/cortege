# Reference material

The IBP methodology documents and the Etats Sauvages graphic charter are **not
redistributed in this repository**. They are third-party works and remain the
property of their respective authors.

## IBP methodology — CNPF / INRAE Dynafor

### Method version status

- **Implemented: IBP Fr v3.0.** The API and mobile scoring rules follow v3.0 as transcribed in
  [`../specs/ibp-form-spec.md`](../specs/ibp-form-spec.md) and
  [`../technical/ibp-validation-matrix-v1.md`](../technical/ibp-validation-matrix-v1.md). The
  official v3.0 PDFs are no longer published by CNPF.
- **Target: IBP FR v3.2 (02/02/2026)**, adopted by
  [ADR-003](../technical/adr-003-ibp-method-version-v1.md). The scoring rules change in phase
  01.8 (shared IBP domain package); until then the app computes v3.0 scores. The differences are
  listed factor by factor in
  [`../technical/ibp-version-comparison-v3.0-v3.2.md`](../technical/ibp-version-comparison-v3.0-v3.2.md).

### Documents

Authors: Gonin P., Larrieu L. (v3.0); Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S.,
Miozzo M., Palero N. (v3.2). © CNPF, INRAE Dynafor.
Official documents are published on the CNPF website:

- IBP home page (current documents): <https://www.cnpf.fr/ibp>
- IBP FR v3.2 (target method, ADR-003): definition and survey sheets, dated 02/02/2026, 28 pp.,
  also contains the survey instructions (p. 18-19):
  <https://www.cnpf.fr/sites/socle/files/2026-04/IBP_FR_v3_2_260202.pdf>
  (retrieved 2026-09-26, SHA-256
  `f130b3d66522ec0f5692e87e361b628b4941ce9748d1ed5519a49734854bd001`)
- IBP Fr v3.0 (implemented method): definition, no longer online (HTTP 404, checked 2026-09-26);
  CNPF no longer publishes v3.0:
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/9a66d6016d0a99f576f35f53df4e73f3/ibp_def_fr_v3_0_230323_0.pdf>
- IBP Fr v3.0 (implemented method): survey sheets, no longer online (HTTP 404, checked
  2026-09-26); CNPF no longer publishes v3.0:
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/5cf710f876f8e4ddfd4007df318f71f5/ibp_rel_fr_v3_0_230323_0.pdf>
- IBP survey methods (2022-10-10), no longer online (HTTP 404, checked 2026-09-26); v3.2 now
  includes the survey instructions (p. 18-19):
  <https://www.cnpf.fr/sites/socle/files/cnpf-old/medias/documents/e5f7f1ea0f6f4f63a2ef41a58ecab8e0/ibp_methodes_de_releve_v221010_0.pdf>

Cite as:

- Implemented method: Gonin P., Larrieu L., 2022 — *Indice de Biodiversité Potentielle
  (IBP Fr v3.0)*. CNPF, INRAE Dynafor.
- Target method (ADR-003): Gonin P., Larrieu L., Marty P., Baiges T., Corezzola S., Miozzo M.,
  Palero N., 2026 — *Indice de Biodiversité Potentielle pour les forêts de France métropolitaine
  (IBP FR v3.2) : définition et fiches de relevé*. CNPF, INRAE Dynafor, 02/02/26, 28 p.

The scoring rules implemented in this app are derived from IBP Fr v3.0. The factor-by-factor
transcription used by the product lives in
[`../specs/ibp-form-spec.md`](../specs/ibp-form-spec.md) and
[`../technical/ibp-validation-matrix-v1.md`](../technical/ibp-validation-matrix-v1.md).

## Etats Sauvages graphic charter

The charter PDF is an internal document of the association and is not published
here. The implementation-ready rules extracted from it (palette, typography,
brand markers) live in
[`../design/charte-graphique-etats-sauvages-spec.md`](../design/charte-graphique-etats-sauvages-spec.md).

## Working locally

If you need the source PDFs, download the v3.2 PDF from the link above and keep it outside the
repository — `*.pdf` is gitignored in this directory. Check its SHA-256 against the value above.
The v3.0 PDFs can no longer be downloaded: CNPF no longer publishes them.
