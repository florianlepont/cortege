import { memo, useMemo } from "react"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { formatDay } from "../../app/formatters"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { ScoreRing } from "../../ui/ScoreRing"
import { createRowStyles } from "../survey-list/row-styles"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"

const t = fr.surveyList.community

type CommunityRowProps = { item: CommunitySurveyItem; onOpen: (surveyId: string) => void }

/**
 * A finished survey of another member (OA-52): its name, its author, the date and the score. It
 * opens the read-only page of that survey (OA-59). The box is the one of "Mes relevés" rows
 * (`SurveyRowFrame`, D-23); only the second line differs (author and date instead of a status chip).
 */
function CommunityRowComponent({ item, onOpen }: CommunityRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createRowStyles(theme), [theme])
  const author = item.author_name?.trim() || t.unknownAuthor
  return (
    <SurveyRowFrame
      accessibilityLabel={t.a11y({ name: item.site_name, author, score: item.ibp_total })}
      onPress={() => onOpen(item.survey_id)}
      testID={`community-row-${item.survey_id}`}
      indicator={<ScoreRing score={item.ibp_total} />}
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
