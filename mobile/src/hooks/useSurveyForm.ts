import { useCallback, useMemo, useState } from "react"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  allowedScoresFor,
  casFromRegionStage,
  isIbpCas,
  resolveMethodVersion,
  type IbpCas,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import {
  DEFAULT_SURVEY_FORM,
  defaultVegetationStageForRegion,
  normalizeVegetationStageForRegion,
} from "../app/constants"
import { parseGenusListValue, serializeGenusListValue } from "../app/factor-a-genus-list"
import { computeRetainedScoresFromRawFactors } from "../app/ibp-scoring"
import { parseFiniteNumberInput } from "../app/number-utils"
import { fr } from "../i18n"
import {
  FactorField,
  FactorRetainedScore,
  FactorKey,
  GpsCaptureResult,
  RegionVersion,
  VegetationStage,
} from "../app/types"

const toTextNum = (value: unknown, fallback = ""): string => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && value.trim().length > 0) return value
  return fallback
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const normalizeParcelIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  const output: string[] = []
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      continue
    }
    const normalized = candidate.trim().toUpperCase()
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    output.push(normalized)
  }
  return output
}

const toFiniteNumberInRange = (
  value: string,
  options?: { min?: number; max?: number; integer?: boolean },
): number | null => {
  const parsed = parseFiniteNumberInput(value)
  if (parsed === null) return null
  if (options?.integer && !Number.isInteger(parsed)) return null
  if (typeof options?.min === "number" && parsed < options.min) return null
  if (typeof options?.max === "number" && parsed > options.max) return null
  return parsed
}

type GpsFormValue = typeof DEFAULT_SURVEY_FORM.gpsLocation

/** The draft the form saves: storage's DraftInput, with the form's narrower method types. */
export type SurveyFormDraftInput = {
  site_name: string
  ibp_method_version?: IbpMethodVersion
  ibp_cas?: IbpCas | null
  ibp_cas3_scale?: boolean
  region_version?: RegionVersion
  vegetation_stage?: VegetationStage
  factors: Record<string, unknown>
  parcel_ids: string[]
}
type FieldError = string | null

type SurveyFormErrors = {
  siteName: FieldError
}

const { fields, rules } = fr.validation

// H is scored 0, 2 or 5 only (BUG-2): the allowed set comes from the package.
const H_ALLOWED_SCORES: readonly number[] = allowedScoresFor("H")

/** The stored tag of a draft, or null when it has none (legacy = v3.0) or an unknown one. */
const readMethodVersion = (raw: unknown): IbpMethodVersion | null =>
  raw === IBP_METHOD_V3_0 || raw === IBP_METHOD_V3_2 ? raw : null

/** A's native cover: on A, else the legacy location on B (moves to A on the next save, CH-7). */
const readNativeCover = (
  factorA: Record<string, unknown>,
  factorB: Record<string, unknown>,
): string =>
  toTextNum(
    factorA.native_cover_percent,
    toTextNum(factorB.covered_autochthonous_percent, toTextNum(factorB.native_cover_percent)),
  )

// Only the message texts come from the catalogue; which values are valid is
// unchanged (the rules move to the shared domain package in 01.8).
const requiredError = (value: string, label: string): FieldError =>
  value.trim().length === 0 ? rules.required(label) : null

const numberError = (
  value: string,
  label: string,
  options?: { min?: number; max?: number; integer?: boolean },
): FieldError => {
  if (value.trim().length === 0) return rules.required(label)

  const parsed = parseFiniteNumberInput(value)
  if (parsed === null) return rules.number(label)
  if (options?.integer && !Number.isInteger(parsed)) return rules.integer(label)
  if (typeof options?.min === "number" && parsed < options.min) return rules.min(label, options.min)
  if (typeof options?.max === "number" && parsed > options.max) return rules.max(label, options.max)
  return null
}

const oneOfError = (value: string, label: string, allowed: readonly number[]): FieldError => {
  const base = numberError(value, label, { integer: true })
  if (base) return base
  const parsed = parseFiniteNumberInput(value)
  if (parsed === null || !allowed.includes(parsed)) {
    return rules.oneOf(label, allowed.join(", "))
  }
  return null
}

export function useSurveyForm() {
  const [siteName, setSiteName] = useState(DEFAULT_SURVEY_FORM.siteName)
  const [regionVersion, setRegionVersion] = useState<RegionVersion>(
    DEFAULT_SURVEY_FORM.regionVersion,
  )
  const [vegetationStage, setVegetationStage] = useState<VegetationStage>(
    DEFAULT_SURVEY_FORM.vegetationStage,
  )
  const [gpsLocation, setGpsLocation] = useState<GpsFormValue>(DEFAULT_SURVEY_FORM.gpsLocation)
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([])

  const [ibpMethodVersion, setIbpMethodVersionState] = useState<IbpMethodVersion | null>(
    DEFAULT_SURVEY_FORM.ibpMethodVersion,
  )
  const [ibpCas, setIbpCas] = useState<IbpCas | null>(DEFAULT_SURVEY_FORM.ibpCas)
  const [ibpCas3Scale, setIbpCas3Scale] = useState<boolean>(DEFAULT_SURVEY_FORM.ibpCas3Scale)

  // FLOW-02: a field's error only shows once it has been touched (left once) or submission was
  // attempted. Keyed by "factor:label" (both stable across a factor's fixed field list).
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const markFieldTouched = useCallback((factor: FactorKey, label: string): void => {
    const key = `${factor}:${label}`
    setTouchedFields((current) => (current.has(key) ? current : new Set(current).add(key)))
  }, [])

  const markSubmitAttempted = useCallback((): void => {
    setSubmitAttempted(true)
  }, [])

  const [factorA, setFactorA] = useState(DEFAULT_SURVEY_FORM.factorA)
  const [factorB, setFactorB] = useState(DEFAULT_SURVEY_FORM.factorB)
  const [factorC, setFactorC] = useState(DEFAULT_SURVEY_FORM.factorC)
  const [factorD, setFactorD] = useState(DEFAULT_SURVEY_FORM.factorD)
  const [factorE, setFactorE] = useState(DEFAULT_SURVEY_FORM.factorE)
  const [factorF, setFactorF] = useState(DEFAULT_SURVEY_FORM.factorF)
  const [factorG, setFactorG] = useState(DEFAULT_SURVEY_FORM.factorG)
  const [factorH, setFactorH] = useState(DEFAULT_SURVEY_FORM.factorH)
  const [factorI, setFactorI] = useState(DEFAULT_SURVEY_FORM.factorI)
  const [factorJ, setFactorJ] = useState(DEFAULT_SURVEY_FORM.factorJ)

  const handleRegionChange = (nextRegion: RegionVersion): void => {
    setRegionVersion(nextRegion)
    setVegetationStage((current) => normalizeVegetationStageForRegion(nextRegion, current))
  }

  /**
   * Picks the survey's method version (D-02). The form only ever holds a new survey or an
   * unsubmitted draft (useEditingDraft refuses to open a submitted one), so the version is still
   * free here. Choosing the version the survey already follows changes nothing: a legacy draft
   * (null) stays untagged. Otherwise the other version's context fields are reset: v3.2 takes its
   * cas from the region and stage where unambiguous (else null: the observer picks), v3.0 drops the
   * cas and flag and restores the region/stage defaults.
   */
  const setIbpMethodVersion = (next: IbpMethodVersion): void => {
    if (resolveMethodVersion(ibpMethodVersion) === next) return
    setIbpMethodVersionState(next)
    setIbpCas3Scale(false)
    if (next === IBP_METHOD_V3_2) {
      setIbpCas(casFromRegionStage(regionVersion, vegetationStage))
    } else {
      setIbpCas(null)
    }
    setRegionVersion(DEFAULT_SURVEY_FORM.regionVersion)
    setVegetationStage(defaultVegetationStageForRegion(DEFAULT_SURVEY_FORM.regionVersion))
  }

  const applyGpsLocation = (location: GpsCaptureResult): void => {
    setGpsLocation({
      lat: String(location.lat),
      lng: String(location.lng),
      collected_at: location.collected_at,
    })
  }

  const toggleParcelSelection = (parcelIdRaw: string): void => {
    const parcelId = parcelIdRaw.trim().toUpperCase()
    if (!parcelId) {
      return
    }
    setSelectedParcelIds((current) =>
      current.includes(parcelId) ? current.filter((id) => id !== parcelId) : [...current, parcelId],
    )
  }

  const buildFactorsPayload = useCallback((): Record<string, unknown> => {
    const payload: Record<string, unknown> = {}

    const aCover = toFiniteNumberInRange(factorA.native_cover_percent, { min: 0, max: 100 })
    if (aCover !== null)
      payload.A = { genera: parseGenusListValue(factorA.genera), native_cover_percent: aCover }

    const bStrata = toFiniteNumberInRange(factorB.strata_count, { min: 0, integer: true })
    if (bStrata !== null) payload.B = { strata_count: bStrata }

    const cBmg = toFiniteNumberInRange(factorC.bmg_count, { min: 0, integer: true })
    const cBmm = toFiniteNumberInRange(factorC.bmm_count, { min: 0, integer: true })
    const cSurface = toFiniteNumberInRange(factorC.surface_ha, { min: 0.000001 })
    if (cBmg !== null && cBmm !== null && cSurface !== null)
      payload.C = { bmg_count: cBmg, bmm_count: cBmm, surface_ha: cSurface }

    const dBmg = toFiniteNumberInRange(factorD.bmg_count, { min: 0, integer: true })
    const dBmm = toFiniteNumberInRange(factorD.bmm_count, { min: 0, integer: true })
    const dSurface = toFiniteNumberInRange(factorD.surface_ha, { min: 0.000001 })
    if (dBmg !== null && dBmm !== null && dSurface !== null)
      payload.D = { bmg_count: dBmg, bmm_count: dBmm, surface_ha: dSurface }

    const eTgb = toFiniteNumberInRange(factorE.tgb_count, { min: 0, integer: true })
    const eGb = toFiniteNumberInRange(factorE.gb_count, { min: 0, integer: true })
    const eSurface = toFiniteNumberInRange(factorE.surface_ha, { min: 0.000001 })
    if (eTgb !== null && eGb !== null && eSurface !== null)
      payload.E = { tgb_count: eTgb, gb_count: eGb, surface_ha: eSurface }

    const f = toFiniteNumberInRange(factorF.trees_per_ha, { min: 0 })
    if (f !== null) payload.F = { trees_per_ha: f }

    const g = toFiniteNumberInRange(factorG.open_flowering_percent, { min: 0, max: 100 })
    if (g !== null) payload.G = { open_flowering_percent: g }

    const h = toFiniteNumberInRange(factorH.class_score, { integer: true })
    if (h !== null && H_ALLOWED_SCORES.includes(h)) payload.H = { class_score: h }

    const i = toFiniteNumberInRange(factorI.type_count, { min: 0, integer: true })
    if (i !== null) payload.I = { type_count: i }

    const j = toFiniteNumberInRange(factorJ.type_count, { min: 0, integer: true })
    if (j !== null) payload.J = { type_count: j }

    return payload
  }, [factorA, factorB, factorC, factorD, factorE, factorF, factorG, factorH, factorI, factorJ])

  const applyDraftToForm = (draftValue: unknown): void => {
    const draft = asObject(draftValue)
    setSiteName(
      typeof draft.site_name === "string" ? draft.site_name : DEFAULT_SURVEY_FORM.siteName,
    )
    const nextRegion: RegionVersion = draft.region_version === "M" ? "M" : "ACA"
    setRegionVersion(nextRegion)
    setVegetationStage(normalizeVegetationStageForRegion(nextRegion, draft.vegetation_stage))
    // The draft's raw version: null for an untagged legacy draft, which the form never stamps.
    const nextVersion = readMethodVersion(draft.ibp_method_version)
    setIbpMethodVersionState(nextVersion)
    setIbpCas(nextVersion === IBP_METHOD_V3_2 && isIbpCas(draft.ibp_cas) ? draft.ibp_cas : null)
    setIbpCas3Scale(nextVersion === IBP_METHOD_V3_2 && draft.ibp_cas3_scale === true)

    const factors = asObject(draft.factors)
    const factorAObj = asObject(factors.A)
    const factorBObj = asObject(factors.B)
    const factorCObj = asObject(factors.C)
    const factorDObj = asObject(factors.D)
    const factorEObj = asObject(factors.E)
    const factorFObj = asObject(factors.F)
    const factorGObj = asObject(factors.G)
    const factorHObj = asObject(factors.H)
    const factorIObj = asObject(factors.I)
    const factorJObj = asObject(factors.J)
    const parsedParcelIds = normalizeParcelIds(draft.parcel_ids)

    // A legacy bare-count draft (created before this phase) has no `genera` key - it cannot be
    // decomposed into named genera (Phase 5's own rule for already-recorded surveys applies the
    // same way to a still-local draft), so it reopens with an empty genus list, not a re-derived
    // count.
    const storedGenera = Array.isArray(factorAObj.genera)
      ? factorAObj.genera.filter((code): code is string => typeof code === "string")
      : []
    setFactorA({
      genera: serializeGenusListValue(parseGenusListValue(storedGenera.join(","))),
      native_cover_percent: readNativeCover(factorAObj, factorBObj),
    })
    setFactorB({ strata_count: toTextNum(factorBObj.strata_count) })
    setFactorC({
      bmg_count: toTextNum(factorCObj.bmg_count),
      bmm_count: toTextNum(factorCObj.bmm_count),
      surface_ha: toTextNum(factorCObj.surface_ha),
    })
    setFactorD({
      bmg_count: toTextNum(factorDObj.bmg_count),
      bmm_count: toTextNum(factorDObj.bmm_count),
      surface_ha: toTextNum(factorDObj.surface_ha),
    })
    setFactorE({
      tgb_count: toTextNum(factorEObj.tgb_count),
      gb_count: toTextNum(factorEObj.gb_count),
      surface_ha: toTextNum(factorEObj.surface_ha),
    })
    setFactorF({ trees_per_ha: toTextNum(factorFObj.trees_per_ha) })
    setFactorG({ open_flowering_percent: toTextNum(factorGObj.open_flowering_percent) })
    setFactorH({ class_score: toTextNum(factorHObj.class_score) })
    setFactorI({ type_count: toTextNum(factorIObj.type_count) })
    setFactorJ({ type_count: toTextNum(factorJObj.type_count) })

    setGpsLocation(DEFAULT_SURVEY_FORM.gpsLocation)
    setSelectedParcelIds(parsedParcelIds)
    setTouchedFields(new Set())
    setSubmitAttempted(false)
  }

  // The live preview scores exactly what the form would save, under the survey's method context
  // (the package ignores the other version's fields).
  const factorRetainedScores = useMemo<Record<FactorKey, FactorRetainedScore | null>>(
    () =>
      computeRetainedScoresFromRawFactors(buildFactorsPayload(), {
        ibp_method_version: ibpMethodVersion,
        ibp_cas: ibpCas,
        ibp_cas3_scale: ibpCas3Scale,
        region_version: regionVersion,
        vegetation_stage: vegetationStage,
      }),
    [buildFactorsPayload, ibpMethodVersion, ibpCas, ibpCas3Scale, regionVersion, vegetationStage],
  )

  const formErrors = useMemo<SurveyFormErrors>(
    () => ({
      siteName: requiredError(siteName, fields.siteName),
    }),
    [siteName],
  )

  const resetSurveyForm = (): void => {
    setSiteName(DEFAULT_SURVEY_FORM.siteName)
    setRegionVersion(DEFAULT_SURVEY_FORM.regionVersion)
    setVegetationStage(defaultVegetationStageForRegion(DEFAULT_SURVEY_FORM.regionVersion))
    setIbpMethodVersionState(DEFAULT_SURVEY_FORM.ibpMethodVersion)
    setIbpCas(DEFAULT_SURVEY_FORM.ibpCas)
    setIbpCas3Scale(DEFAULT_SURVEY_FORM.ibpCas3Scale)
    setGpsLocation(DEFAULT_SURVEY_FORM.gpsLocation)
    setSelectedParcelIds([])
    setTouchedFields(new Set())
    setSubmitAttempted(false)
    setFactorA(DEFAULT_SURVEY_FORM.factorA)
    setFactorB(DEFAULT_SURVEY_FORM.factorB)
    setFactorC(DEFAULT_SURVEY_FORM.factorC)
    setFactorD(DEFAULT_SURVEY_FORM.factorD)
    setFactorE(DEFAULT_SURVEY_FORM.factorE)
    setFactorF(DEFAULT_SURVEY_FORM.factorF)
    setFactorG(DEFAULT_SURVEY_FORM.factorG)
    setFactorH(DEFAULT_SURVEY_FORM.factorH)
    setFactorI(DEFAULT_SURVEY_FORM.factorI)
    setFactorJ(DEFAULT_SURVEY_FORM.factorJ)
  }

  // FLOW-02: touched state per field, keyed by "factor:label"; submission-attempted forces every
  // field to show its error regardless of touch.
  const touchState = useCallback(
    (factor: FactorKey, label: string): { touched: boolean; onTouch: () => void } => ({
      touched: submitAttempted || touchedFields.has(`${factor}:${label}`),
      onTouch: () => markFieldTouched(factor, label),
    }),
    [markFieldTouched, submitAttempted, touchedFields],
  )

  const factorSections = useMemo<Record<FactorKey, FactorField[]>>(
    () => ({
      A: [
        {
          label: fields.genera,
          value: factorA.genera,
          onChange: (value) => setFactorA((prev) => ({ ...prev, genera: value })),
          error: null,
          ...touchState("A", fields.genera),
        },
        {
          label: fields.native_cover_percent,
          value: factorA.native_cover_percent,
          onChange: (value) => setFactorA((prev) => ({ ...prev, native_cover_percent: value })),
          required: true,
          error: numberError(factorA.native_cover_percent, fields.native_cover_percent, {
            min: 0,
            max: 100,
          }),
          ...touchState("A", fields.native_cover_percent),
        },
      ],
      B: [
        {
          label: fields.strata_count,
          value: factorB.strata_count,
          onChange: (value) => setFactorB((prev) => ({ ...prev, strata_count: value })),
          required: true,
          error: numberError(factorB.strata_count, fields.strata_count, { min: 0, integer: true }),
          ...touchState("B", fields.strata_count),
        },
      ],
      C: [
        {
          label: fields.bmg_count,
          value: factorC.bmg_count,
          onChange: (value) => setFactorC((prev) => ({ ...prev, bmg_count: value })),
          required: true,
          error: numberError(factorC.bmg_count, fields.bmg_count, { min: 0, integer: true }),
          ...touchState("C", fields.bmg_count),
        },
        {
          label: fields.bmm_count,
          value: factorC.bmm_count,
          onChange: (value) => setFactorC((prev) => ({ ...prev, bmm_count: value })),
          required: true,
          error: numberError(factorC.bmm_count, fields.bmm_count, { min: 0, integer: true }),
          ...touchState("C", fields.bmm_count),
        },
        {
          label: fields.surface_ha,
          value: factorC.surface_ha,
          onChange: (value) => setFactorC((prev) => ({ ...prev, surface_ha: value })),
          required: true,
          error: numberError(factorC.surface_ha, fields.surface_ha, { min: 0.000001 }),
          ...touchState("C", fields.surface_ha),
        },
      ],
      D: [
        {
          label: fields.bmg_count,
          value: factorD.bmg_count,
          onChange: (value) => setFactorD((prev) => ({ ...prev, bmg_count: value })),
          required: true,
          error: numberError(factorD.bmg_count, fields.bmg_count, { min: 0, integer: true }),
          ...touchState("D", fields.bmg_count),
        },
        {
          label: fields.bmm_count,
          value: factorD.bmm_count,
          onChange: (value) => setFactorD((prev) => ({ ...prev, bmm_count: value })),
          required: true,
          error: numberError(factorD.bmm_count, fields.bmm_count, { min: 0, integer: true }),
          ...touchState("D", fields.bmm_count),
        },
        {
          label: fields.surface_ha,
          value: factorD.surface_ha,
          onChange: (value) => setFactorD((prev) => ({ ...prev, surface_ha: value })),
          required: true,
          error: numberError(factorD.surface_ha, fields.surface_ha, { min: 0.000001 }),
          ...touchState("D", fields.surface_ha),
        },
      ],
      E: [
        {
          label: fields.tgb_count,
          value: factorE.tgb_count,
          onChange: (value) => setFactorE((prev) => ({ ...prev, tgb_count: value })),
          required: true,
          error: numberError(factorE.tgb_count, fields.tgb_count, { min: 0, integer: true }),
          ...touchState("E", fields.tgb_count),
        },
        {
          label: fields.gb_count,
          value: factorE.gb_count,
          onChange: (value) => setFactorE((prev) => ({ ...prev, gb_count: value })),
          required: true,
          error: numberError(factorE.gb_count, fields.gb_count, { min: 0, integer: true }),
          ...touchState("E", fields.gb_count),
        },
        {
          label: fields.surface_ha,
          value: factorE.surface_ha,
          onChange: (value) => setFactorE((prev) => ({ ...prev, surface_ha: value })),
          required: true,
          error: numberError(factorE.surface_ha, fields.surface_ha, { min: 0.000001 }),
          ...touchState("E", fields.surface_ha),
        },
      ],
      F: [
        {
          label: fields.trees_per_ha,
          value: factorF.trees_per_ha,
          onChange: (value) => setFactorF({ trees_per_ha: value }),
          required: true,
          error: numberError(factorF.trees_per_ha, fields.trees_per_ha, { min: 0 }),
          ...touchState("F", fields.trees_per_ha),
        },
      ],
      G: [
        {
          label: fields.open_flowering_percent,
          value: factorG.open_flowering_percent,
          onChange: (value) => setFactorG({ open_flowering_percent: value }),
          required: true,
          error: numberError(factorG.open_flowering_percent, fields.open_flowering_percent, {
            min: 0,
            max: 100,
          }),
          ...touchState("G", fields.open_flowering_percent),
        },
      ],
      H: [
        {
          label: fields.class_score,
          value: factorH.class_score,
          onChange: (value) => setFactorH({ class_score: value }),
          required: true,
          error: oneOfError(factorH.class_score, fields.class_score, H_ALLOWED_SCORES),
          ...touchState("H", fields.class_score),
        },
      ],
      I: [
        {
          label: fields.type_count,
          value: factorI.type_count,
          onChange: (value) => setFactorI({ type_count: value }),
          required: true,
          error: numberError(factorI.type_count, fields.type_count, { min: 0, integer: true }),
          ...touchState("I", fields.type_count),
        },
      ],
      J: [
        {
          label: fields.type_count,
          value: factorJ.type_count,
          onChange: (value) => setFactorJ({ type_count: value }),
          required: true,
          error: numberError(factorJ.type_count, fields.type_count, { min: 0, integer: true }),
          ...touchState("J", fields.type_count),
        },
      ],
    }),
    [
      factorA,
      factorB,
      factorC,
      factorD,
      factorE,
      factorF,
      factorG,
      factorH,
      factorI,
      factorJ,
      touchState,
    ],
  )

  // What the storage writes (01.8-08 rule): the version only when the form has one (a legacy draft
  // edited without switching sends no key and stays untagged), the cas and flag for v3.2, and
  // region/stage for v3.0. Key order matches useEditingDraft's signatures.
  const draftInput = useMemo((): SurveyFormDraftInput => {
    const methodContext =
      resolveMethodVersion(ibpMethodVersion) === IBP_METHOD_V3_2
        ? { ibp_cas: ibpCas, ibp_cas3_scale: ibpCas3Scale }
        : { region_version: regionVersion, vegetation_stage: vegetationStage }
    return {
      site_name: siteName.trim(),
      ...(ibpMethodVersion !== null ? { ibp_method_version: ibpMethodVersion } : {}),
      ...methodContext,
      factors: buildFactorsPayload(),
      parcel_ids: selectedParcelIds,
    }
  }, [
    siteName,
    ibpMethodVersion,
    ibpCas,
    ibpCas3Scale,
    regionVersion,
    vegetationStage,
    buildFactorsPayload,
    selectedParcelIds,
  ])

  const buildDraftInput = useCallback(() => draftInput, [draftInput])

  return {
    siteName,
    setSiteName,
    regionVersion,
    vegetationStage,
    setVegetationStage,
    gpsLocation,
    selectedParcelIds,
    setSelectedParcelIds,
    toggleParcelSelection,
    applyGpsLocation,
    handleRegionChange,
    ibpMethodVersion,
    ibpCas,
    ibpCas3Scale,
    setIbpMethodVersion,
    setIbpCas,
    setIbpCas3Scale,
    factorSections,
    factorRetainedScores,
    formErrors,
    draftInput,
    applyDraftToForm,
    resetSurveyForm,
    buildDraftInput,
    markSubmitAttempted,
  }
}
