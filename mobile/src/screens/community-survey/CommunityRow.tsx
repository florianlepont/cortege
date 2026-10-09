import { memo, useMemo } from "react"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { formatDay } from "../../app/formatters"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { ScoreRing } from "../../ui/ScoreRing"
import { RECENT_LAYOUT } from "../home/layout-budget"
import { createRowStyles } from "../survey-list/row-styles"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"

const t = fr.surveyList.community

type CommunityRowProps = {
  item: CommunitySurveyItem
  onOpen: (surveyId: string) => void
  /** "regular" (default): the glass card of the full list. "compact": the slim 52 pt row of the search summary. */
  density?: "regular" | "compact"
}

/**
 * A finished survey of another member (OA-52): its name, its author, the date and the score. It
 * opens the read-only page of that survey (OA-59). The box is the one of "Mes relevés" rows
 * (`SurveyRowFrame`, D-23); only the second line differs (author and date instead of a status chip).
 * `density="compact"` (25-04) draws the slim row with the 32 pt ring, for the one card of the search
 * summary; the regular density is unchanged.
 */
function CommunityRowComponent({ item, onOpen, density = "regular" }: CommunityRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createRowStyles(theme), [theme])
  const author = item.author_name?.trim() || t.unknownAuthor
  return (
    <SurveyRowFrame
      density={density}
      accessibilityLabel={t.a11y({ name: item.site_name, author, score: item.ibp_total })}
      onPress={() => onOpen(item.survey_id)}
      testID={`community-row-${item.survey_id}`}
      indicator={
        <ScoreRing
          score={item.ibp_total}
          size={density === "compact" ? RECENT_LAYOUT.ringSize : undefined}
        />
      }
      title={item.site_name.trim() || fr.common.untitledSurvey}
      status={
        <Text numberOfLines={1} style={styles.surveyCardMeta}>
          {t.meta({ author, date: formatDay(item.submitted_at, "short") })}
        </Text>
      }
    />
  )
}

export const CommunityRow = memo(CommunityRowComponent)
