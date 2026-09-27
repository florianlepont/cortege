import {
  IBP_CAS_VALUES,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  IbpCas,
  IbpMethodVersion,
  isIbpCas,
  resolveMethodVersion,
} from "@cortege/ibp-domain"
import { Switch, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandColors } from "../../app/brand-tokens"
import { RegionVersion, SurveyDetailResponse, VegetationStage } from "../../app/types"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../../app/vegetation"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppStatusChip } from "../../ui/AppStatusChip"
import { styles } from "./context-editor.styles"
import { styles as sharedStyles } from "./styles"
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
  onOpenParcels: () => void
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
  const resolved = resolveMethodVersion(scoringContext.ibp_method_version)
  const { ibp_cas: ibpCas, ibp_cas3_scale: ibpCas3Scale } = scoringContext
  const activeRegionLabel =
    REGION_OPTIONS.find((option) => option.value === activeRegion)?.label ?? activeRegion
  const activeVegetationLabel =
    VEGETATION_STAGE_OPTIONS_BY_REGION[activeRegion].find(
      (option) => option.value === activeVegetationStage,
    )?.label ?? activeVegetationStage

  return (
    <AppCard variant="panelElevated" padding={18} style={styles.detailMetadataCard}>
      <AppSectionHeader
        title={t.contextTitle}
        subtitle={t.contextSubtitle}
        trailing={
          canEditSurvey ? (
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
          <View style={sharedStyles.filterChipsRow}>
            {IBP_CAS_VALUES.map((value) => (
              <AppChoiceChip
                key={`detail-ibp-cas-${value}`}
                label={m.casLabels[value]}
                active={ibpCas === value}
                onPress={() => {
                  void onUpdateIbpCas(surveyId, value)
                }}
              />
            ))}
          </View>
          {ibpCas !== null ? (
            <Text style={styles.hint}>{m.casCaptions[ibpCas]}</Text>
          ) : (
            <Text style={styles.warningHint}>{t.casMissing}</Text>
          )}
          <View style={styles.scaleRow}>
            <View style={styles.scaleCopy}>
              <Text style={styles.scaleLabel}>{m.cas3ScaleLabel}</Text>
              <Text style={styles.hint}>{m.cas3ScaleHint}</Text>
            </View>
            <Switch
              value={ibpCas3Scale}
              onValueChange={(value) => {
                void onUpdateCas3Scale(surveyId, value)
              }}
              trackColor={{ false: brandColors.divider, true: brandColors.moss }}
              accessibilityRole="switch"
              accessibilityLabel={m.cas3ScaleLabel}
              accessibilityHint={m.cas3ScaleHint}
              accessibilityState={{ checked: ibpCas3Scale }}
            />
          </View>
        </>
      ) : null}
    </AppCard>
  )
}
