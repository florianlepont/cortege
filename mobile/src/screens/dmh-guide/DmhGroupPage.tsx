import { Ref, useMemo } from "react"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { drawingFor } from "../../app/dmh-guide/drawings"
import { dmhGroupContent } from "../../app/dmh-guide/content"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppNotice } from "../../ui/AppNotice"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { DmhDrawing } from "../../ui/DmhDrawing"
import { createDmhGuideStyles } from "./dmh-guide.styles"

const t = fr.dmhGuide

type DmhGroupPageProps = {
  code: DmhGroupCode
  /** The method of the survey (`null` = version 3.0): groups 6, 12 and 15 word their rule by it. */
  methodVersion: IbpMethodVersion | null
  onOpenSources: () => void
  /** The focus target of the shell when this view opens (the title block). */
  titleRef?: Ref<View>
}

/**
 * One group's identification sheet (32-UI-SPEC S3, ROADMAP criterion 1, D-06). The blocks keep the
 * order of the sheet: definition, then what counts for the IBP (always first after the definition,
 * research pitfall 1), how to recognise it with the group's own drawing, frequent confusions, the
 * types of the pocket guide, and the pocket guide's different threshold only in a labelled notice
 * where the content has one. A leaf view: the shell (plan 32-13) hosts it. Nothing is fetched and
 * no code or type number is shown.
 */
export function DmhGroupPage({ code, methodVersion, onOpenSources, titleRef }: DmhGroupPageProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const content = dmhGroupContent(code, methodVersion)
  const { rule } = content
  const showTypeSubtitles = content.typesCounted.length > 0 && content.typesNotCounted.length > 0
  const ink = theme.semanticColors.textStrong

  return (
    <View style={styles.page} testID="dmh-group-page">
      <View ref={titleRef} accessible accessibilityRole="header" style={styles.titleBlock}>
        <Text style={styles.formCaption}>{t.group.form({ form: content.formName })}</Text>
        <Text style={styles.pageTitle}>{content.label}</Text>
      </View>

      <AppCard variant="glass" style={styles.block}>
        <Text style={styles.blockTitle} accessibilityRole="header">
          {t.group.definitionTitle}
        </Text>
        <Text style={styles.bodyText}>{content.definition}</Text>
      </AppCard>

      <AppCard variant="glass" style={styles.block}>
        <View style={styles.blockTitleRow}>
          <Ionicons
            name="leaf-outline"
            size={18}
            color={ink}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.blockTitle} accessibilityRole="header">
            {t.group.ibpTitle}
          </Text>
        </View>
        <View testID="dmh-ibp-rule" style={styles.block}>
          <Text style={styles.bodyText}>{rule.text}</Text>
          {rule.versionNote ? (
            <Text style={styles.meta}>{t.group.methodNote[rule.versionNote]}</Text>
          ) : null}
        </View>
      </AppCard>

      <AppCard variant="glass" style={styles.block}>
        <Text style={styles.blockTitle} accessibilityRole="header">
          {t.group.recogniseTitle}
        </Text>
        <View style={styles.recogniseBlock}>
          <DmhDrawing drawing={drawingFor(code)} accessibilityLabel={content.illustrationAlt} />
          <Text style={styles.bodyText}>{content.recognise}</Text>
        </View>
      </AppCard>

      <AppCard variant="glass" style={styles.block}>
        <Text style={styles.blockTitle} accessibilityRole="header">
          {t.group.confusionsTitle}
        </Text>
        <View style={styles.bulletList}>
          {content.confusions.map((confusion) => (
            <View key={confusion} style={styles.bulletRow} accessible>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{confusion}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard variant="glass" style={styles.block}>
        <Text style={styles.blockTitle} accessibilityRole="header">
          {t.group.typesTitle}
        </Text>
        {content.typesCounted.length > 0 ? (
          <View testID="dmh-types-counted" style={styles.typeGroup}>
            {showTypeSubtitles ? <Text style={styles.subTitle}>{t.group.typesCounted}</Text> : null}
            {content.typesCounted.map((name) => (
              <Text
                key={name}
                style={styles.typeRow}
                accessibilityLabel={t.group.typeCountedA11y({ name })}
              >
                {name}
              </Text>
            ))}
          </View>
        ) : null}
        {content.typesNotCounted.length > 0 ? (
          <View testID="dmh-types-not-counted" style={styles.typeGroup}>
            <Text style={styles.subTitle}>{t.group.typesNotCounted}</Text>
            {content.typesNotCounted.map((name) => (
              <Text
                key={name}
                style={styles.typeRow}
                accessibilityLabel={t.group.typeNotCountedA11y({ name })}
              >
                {name}
              </Text>
            ))}
          </View>
        ) : null}
      </AppCard>

      {content.difference ? (
        <View testID="dmh-difference" accessible>
          <AppNotice
            tone="info"
            icon="information-circle-outline"
            title={t.group.differenceTitle}
            message={[t.group.differenceLead, content.difference].join(" ")}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.meta}>{t.group.footer}</Text>
        <AppPressable
          testID="dmh-sources-link"
          style={styles.link}
          onPress={onOpenSources}
          accessibilityRole="button"
          accessibilityLabel={t.sheet.sourcesLink}
        >
          <Text style={styles.linkText}>{t.sheet.sourcesLink}</Text>
        </AppPressable>
      </View>
    </View>
  )
}
