import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  IbpCas,
  IbpMethodVersion,
  isIbpCas,
  resolveMethodVersion,
} from "@cortege/ibp-domain"
import { useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { RegionVersion, SurveyDetailResponse, VegetationStage } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../../app/vegetation"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppStatusChip } from "../../ui/AppStatusChip"
import { CasPicker } from "../../ui/CasPicker"
import { createContextEditorStyles } from "./context-editor.styles"
import { createDetailStyles } from "./styles"
import { LocalDraftMeta } from "./useLocalDraftSummary"

const t = fr.surveyDetail.summary
const m = fr.ibpMethod

/** The method fields the detail shows: the raw version (null = untagged, read as v3.0). */
export type ScoringContext = {
  ibp_method_version: string | null
  ibp_cas: IbpCas | null
  ibp_cas3_scale: boolean
}

type MethodSource = {
  ibp_method_version?: string | null
  ibp_cas?: number | null
  ibp_cas3_scale?: boolean | null
}

const toScoringContext = (source: MethodSource | null | undefined): ScoringContext => ({
  ibp_method_version:
    typeof source?.ibp_method_version === "string" && source.ibp_method_version.length > 0
      ? source.ibp_method_version
      : null,
  ibp_cas: isIbpCas(source?.ibp_cas) ? source.ibp_cas : null,
  ibp_cas3_scale: source?.ibp_cas3_scale === true,
})

/**
 * Where the detail reads the method from. A submitted survey is fixed on the server (D-02), so its
 * detail wins; a draft's local payload holds the latest edits. Each falls back to the other.
 */
export function resolveScoringContext(
  localMeta: LocalDraftMeta | null,
  detail: SurveyDetailResponse | undefined,
  isSubmitted: boolean,
): ScoringContext {
  const primary = isSubmitted ? (detail ?? localMeta) : (localMeta ?? detail)
  return toScoringContext(primary)
}

const versionLabel = (raw: string | null, resolved: IbpMethodVersion | null): string => {
  if (raw === null) return m.legacyVersionLabel
  return resolved ? m.versions[resolved] : t.unknownMethod
}

type ScoringContextEditorProps = {
  surveyId: string
  canEditSurvey: boolean
  scoringContext: ScoringContext
  activeRegion: RegionVersion
  activeVegetationStage: VegetationStage
  /** Absent when the page already offers the parcel editing (the map's own button). */
  onOpenParcels?: () => void
  onUpdateRegionVersion: (surveyId: string, region: RegionVersion) => Promise<void> | void
  onUpdateVegetationStage: (surveyId: string, stage: VegetationStage) => Promise<void> | void
  onUpdateIbpCas: (surveyId: string, ibpCas: IbpCas) => Promise<void> | void
  onUpdateCas3Scale: (surveyId: string, value: boolean) => Promise<void> | void
  onSwitchToV32: (surveyId: string) => Promise<void> | void
}

/**
 * The survey's method and station context (plan 01.8-14). The version is read-only once the survey
 * is submitted (D-02). An unsubmitted v3.0 (or untagged) draft edits its region and stage and can
 * switch to v3.2 (D-08 amended, CH-7); a v3.2 draft edits its `ibp_cas` and cas-3 scale.
 */
export function ScoringContextEditor({
  surveyId,
  canEditSurvey,
  scoringContext,
  activeRegion,
  activeVegetationStage,
  onOpenParcels,
  onUpdateRegionVersion,
  onUpdateVegetationStage,
  onUpdateIbpCas,
  onUpdateCas3Scale,
  onSwitchToV32,
}: ScoringContextEditorProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createContextEditorStyles(theme), [theme])
  const sharedStyles = useMemo(() => createDetailStyles(theme), [theme])
  const resolved = resolveMethodVersion(scoringContext.ibp_method_version)
  const { ibp_cas: ibpCas, ibp_cas3_scale: ibpCas3Scale } = scoringContext
  const activeRegionLabel =
    REGION_OPTIONS.find((option) => option.value === activeRegion)?.label ?? activeRegion
  const activeVegetationLabel =
    VEGETATION_STAGE_OPTIONS_BY_REGION[activeRegion].find(
      (option) => option.value === activeVegetationStage,
    )?.label ?? activeVegetationStage

  return (
    <View style={styles.detailMetadataCard}>
      <AppSectionHeader
        title={t.contextTitle}
        subtitle={t.contextSubtitle}
        trailing={
          canEditSurvey && onOpenParcels ? (
            <AppButton
              label={t.editParcels}
              variant="secondary"
              size="sm"
              leadingIcon="map-outline"
              onPress={onOpenParcels}
              style={styles.detailParcelsEditButton}
            />
          ) : null
        }
      />

      <View style={styles.methodBlock}>
        <Text style={styles.groupTitle}>{m.versionTitle}</Text>
        <View style={styles.summaryRow}>
          <AppStatusChip
            label={versionLabel(scoringContext.ibp_method_version, resolved)}
            style={styles.summaryItem}
            labelStyle={styles.summaryItemLabel}
          />
          {!canEditSurvey && resolved === IBP_METHOD_V3_2 && ibpCas !== null ? (
            <AppStatusChip
              label={m.casLabels[ibpCas]}
              style={styles.summaryItem}
              labelStyle={styles.summaryItemLabel}
            />
          ) : null}
          {!canEditSurvey && resolved === IBP_METHOD_V3_2 && ibpCas3Scale ? (
            <AppStatusChip
              label={m.cas3ScaleLabel}
              style={styles.summaryItem}
              labelStyle={styles.summaryItemLabel}
            />
          ) : null}
          {!canEditSurvey && resolved === IBP_METHOD_V3_0 ? (
            <>
              <AppStatusChip
                label={t.region(activeRegionLabel)}
                style={styles.summaryItem}
                labelStyle={styles.summaryItemLabel}
              />
              <AppStatusChip
                label={t.vegetation(activeVegetationLabel)}
                style={styles.summaryItem}
                labelStyle={styles.summaryItemLabel}
              />
            </>
          ) : null}
        </View>
        {!canEditSurvey ? <Text style={styles.hint}>{m.versionLockedHint}</Text> : null}
      </View>

      {canEditSurvey && resolved === IBP_METHOD_V3_0 ? (
        <>
          <View style={sharedStyles.filterChipsRow}>
            {REGION_OPTIONS.map((option) => (
              <AppChoiceChip
                key={`detail-region-${option.value}`}
                label={option.label}
                active={activeRegion === option.value}
                onPress={() => {
                  void onUpdateRegionVersion(surveyId, option.value)
                }}
              />
            ))}
          </View>
          <View style={sharedStyles.filterChipsRow}>
            {VEGETATION_STAGE_OPTIONS_BY_REGION[activeRegion].map((option) => (
              <AppChoiceChip
                key={`detail-stage-${option.value}`}
                label={option.label}
                active={activeVegetationStage === option.value}
                onPress={() => {
                  void onUpdateVegetationStage(surveyId, option.value)
                }}
              />
            ))}
          </View>
          <AppButton
            label={m.switchToV32}
            variant="secondary"
            size="sm"
            leadingIcon="swap-horizontal-outline"
            onPress={() => {
              void onSwitchToV32(surveyId)
            }}
            style={styles.switchVersionButton}
          />
          <Text style={styles.hint}>{m.switchToV32Hint}</Text>
        </>
      ) : null}

      {canEditSurvey && resolved === IBP_METHOD_V3_2 ? (
        <>
          <Text style={styles.groupTitle}>{m.casTitle}</Text>
          {ibpCas === null ? <Text style={styles.warningHint}>{t.casMissing}</Text> : null}
          <CasPicker
            value={ibpCas}
            onChange={(value) => {
              void onUpdateIbpCas(surveyId, value)
            }}
            cas3Scale={ibpCas3Scale}
            onCas3ScaleChange={(value) => {
              void onUpdateCas3Scale(surveyId, value)
            }}
          />
        </>
      ) : null}
    </View>
  )
}
