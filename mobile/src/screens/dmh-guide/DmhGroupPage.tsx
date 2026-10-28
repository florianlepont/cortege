import { Ref, useMemo } from "react"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { drawingFor } from "../../app/dmh-guide/drawings"
import { dmhGroupContent } from "../../app/dmh-guide/content"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppGroupedContainer } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { DmhDrawing } from "../../ui/DmhDrawing"
import { DmhCallout } from "./DmhCallout"
import { DmhSourcesLinkRow } from "./DmhSourcesLinkRow"
import {
  createDmhGuideStyles,
  DMH_GUIDE_HERO_DRAWING_HEIGHT,
  DMH_GUIDE_ICON_ROW_INSET,
} from "./dmh-guide.styles"

const t = fr.dmhGuide

const GLYPH = 18

type DmhGroupPageProps = {
  code: DmhGroupCode
  /** The method of the survey (`null` = version 3.0): groups 6, 12 and 15 word their rule by it. */
  methodVersion: IbpMethodVersion | null
  onOpenSources: () => void
  /** The focus target of the shell when this view opens (the title block). */
  titleRef?: Ref<View>
}

/**
 * One group's identification sheet (32-UI-SPEC S3, ROADMAP criterion 1, D-06), redesigned as a calm
 * hierarchy (brief B-C2, B-I4): the group's drawing on its moss plate at the top (at most 168 pt),
 * the title block, the definition as a lead paragraph, then the one tinted block, "Ce qui compte
 * pour l'IBP", which carries the pocket guide's different threshold where the content has one
 * (always first after the definition, research pitfall 1), then plain headings over the way to
 * recognise the group, the frequent confusions and the types of the pocket guide (grouped lists),
 * and the foot with the "Sources et licence" row. A leaf view: the shell hosts it. Nothing is
 * fetched and no code or type number is shown.
 */
export function DmhGroupPage({ code, methodVersion, onOpenSources, titleRef }: DmhGroupPageProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const content = dmhGroupContent(code, methodVersion)
  const { rule } = content
  const drawing = drawingFor(code)
  const showTypeSubtitles = content.typesCounted.length > 0 && content.typesNotCounted.length > 0

  const typeList = (
    testID: string,
    header: string | null,
    names: readonly string[],
    icon: keyof typeof Ionicons.glyphMap,
    iconColor: string,
    label: (name: string) => string,
  ) => (
    <View testID={testID} style={styles.typeList}>
      {header ? (
        <Text style={styles.groupedHeader} accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <AppGroupedContainer dividerInset={DMH_GUIDE_ICON_ROW_INSET}>
        {names.map((name) => (
          <View key={name} style={styles.listRow}>
            <Ionicons
              name={icon}
              size={GLYPH}
              color={iconColor}
              style={styles.listIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.listText} accessibilityLabel={label(name)}>
              {name}
            </Text>
          </View>
        ))}
      </AppGroupedContainer>
    </View>
  )

  return (
    <View testID="dmh-group-page">
      {drawing ? (
        <View style={styles.hero}>
          <DmhDrawing
            drawing={drawing}
            accessibilityLabel={content.illustrationAlt}
            maxHeight={DMH_GUIDE_HERO_DRAWING_HEIGHT}
          />
        </View>
      ) : null}

      <View ref={titleRef} accessible accessibilityRole="header" style={styles.titleBlock}>
        <Text style={styles.formCaption}>{t.group.form({ form: content.formName })}</Text>
        <Text style={styles.pageTitle}>{content.label}</Text>
      </View>

      <Text style={[styles.lead, styles.definition]}>{content.definition}</Text>

      <DmhCallout title={t.group.ibpTitle}>
        <View testID="dmh-ibp-rule" style={styles.calloutBlock}>
          <Text style={styles.calloutRule}>{rule.text}</Text>
          {rule.versionNote ? (
            <Text style={styles.meta}>{t.group.methodNote[rule.versionNote]}</Text>
          ) : null}
        </View>
        {content.difference ? (
          <>
            <View style={styles.calloutDivider} />
            <View testID="dmh-difference" accessible style={styles.calloutNote}>
              <Text style={styles.meta}>{t.group.differenceTitle}</Text>
              <Text style={styles.bodyText}>
                {[t.group.differenceLead, content.difference].join(" ")}
              </Text>
            </View>
          </>
        ) : null}
      </DmhCallout>

      <Text style={styles.guideHeading} accessibilityRole="header">
        {t.group.recogniseTitle}
      </Text>
      <Text style={styles.bodyText}>{content.recognise}</Text>

      <Text style={styles.guideHeading} accessibilityRole="header">
        {t.group.confusionsTitle}
      </Text>
      <AppGroupedContainer dividerInset={DMH_GUIDE_ICON_ROW_INSET}>
        {content.confusions.map((confusion) => (
          <View key={confusion} style={styles.listRow} accessible>
            <Ionicons
              name="swap-horizontal-outline"
              size={GLYPH}
              color={theme.colors.textSecondary}
              style={styles.listIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.listText}>{confusion}</Text>
          </View>
        ))}
      </AppGroupedContainer>

      <Text style={styles.guideHeading} accessibilityRole="header">
        {t.group.typesTitle}
      </Text>
      <View style={styles.typeLists}>
        {content.typesCounted.length > 0
          ? typeList(
              "dmh-types-counted",
              showTypeSubtitles ? t.group.typesCounted : null,
              content.typesCounted,
              "checkmark-outline",
              theme.semanticColors.ctaPrimary,
              (name) => t.group.typeCountedA11y({ name }),
            )
          : null}
        {content.typesNotCounted.length > 0
          ? typeList(
              "dmh-types-not-counted",
              t.group.typesNotCounted,
              content.typesNotCounted,
              "remove-circle-outline",
              theme.colors.textSecondary,
              (name) => t.group.typeNotCountedA11y({ name }),
            )
          : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>{t.group.footer}</Text>
        <DmhSourcesLinkRow onPress={onOpenSources} />
      </View>
    </View>
  )
}
