import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import type { HistoryListRow } from "../../app/parcel-history"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppText as Text } from "../../ui/AppText"
import { ListEntranceRow } from "../../ui/ListEntranceRow"
import { ScoreRing } from "../../ui/ScoreRing"
import { useListEntrance } from "../../ui/useListEntrance"
import { createRowStyles } from "../survey-list/row-styles"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"

const t = fr.parcelHistory
const list = t.page.list

export type HistoryListProps = {
  /** Newest first, as `listRows` returns them. */
  rows: HistoryListRow[]
  /** Community rows lead their title with the author. */
  variant: "own" | "community"
  /** Opens one other survey of the parcel, read-only. */
  onOpenSurvey: (surveyId: string) => void
}

function rowTitle({ entry }: HistoryListRow, variant: HistoryListProps["variant"]): string {
  if (variant === "community") {
    return fr.communitySurvey.history.row({
      author: entry.author?.trim() || fr.communitySurvey.unknownAuthor,
      year: entry.year,
      version: entry.version,
    })
  }
  return t.entry({ year: entry.year, version: entry.version, isLatest: false })
}

/**
 * The surveys of the parcel, newest first (D-08): the app's glass survey rows with a score ring,
 * the change against the survey before it, and the current survey marked "Ce relevé" (selected,
 * not pressable). Every other row opens that survey read-only.
 */
export const HistoryList = memo(function HistoryList({
  rows,
  variant,
  onOpenSurvey,
}: HistoryListProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const canAnimate = useListEntrance()

  return (
    <View style={styles.list}>
      <Text style={styles.header}>{list.title(rows.length)}</Text>
      {rows.map((row, index) => {
        const { entry, deltaVsPrevious, methodLabel } = row
        const title = rowTitle(row, variant)
        const ring = (
          <ScoreRing
            score={entry.total}
            index={index}
            animationKey={`${entry.surveyId}:${entry.total}`}
          />
        )
        const status = (
          <>
            {methodLabel ? (
              <Text style={rowStyles.surveyCardMeta}>{list.method(methodLabel)}</Text>
            ) : null}
            <Text style={rowStyles.surveyCardMeta}>{t.total(entry.total)}</Text>
            {typeof deltaVsPrevious === "number" ? (
              <Text style={rowStyles.surveyCardMeta}>{t.delta.total(deltaVsPrevious)}</Text>
            ) : null}
            {deltaVsPrevious === "unavailable" ? (
              <Text style={rowStyles.surveyCardMeta}>{t.delta.unavailable}</Text>
            ) : null}
            {entry.isCurrent ? (
              <AppChoiceChip variant="status" tone="success" label={list.current} />
            ) : null}
          </>
        )
        return (
          <ListEntranceRow key={entry.surveyId} index={index} canAnimate={canAnimate}>
            {entry.isCurrent ? (
              <SurveyRowFrame
                selected
                disabled
                accessibilityRole="text"
                accessibilityLabel={list.openCurrent({ entry: title, total: entry.total })}
                indicator={ring}
                title={title}
                status={status}
              />
            ) : (
              <SurveyRowFrame
                accessibilityRole="button"
                accessibilityLabel={list.open({ entry: title, total: entry.total })}
                testID={`parcel-history-row-${entry.surveyId}`}
                onPress={() => onOpenSurvey(entry.surveyId)}
                indicator={ring}
                title={title}
                status={status}
              />
            )}
          </ListEntranceRow>
        )
      })}
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    list: {
      gap: brandSpacing4.sm,
    },
    header: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
  })
}
