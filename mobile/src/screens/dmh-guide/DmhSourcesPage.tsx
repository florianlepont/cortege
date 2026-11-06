import { Ref, useMemo } from "react"
import { View } from "react-native"
import { DMH_DRAWINGS } from "../../app/dmh-guide/drawings"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppGroupedContainer } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { DmhCallout } from "./DmhCallout"
import { createDmhGuideStyles } from "./dmh-guide.styles"

const t = fr.dmhGuide.sources

type DmhSourcesPageProps = {
  /** The focus target of the shell when this view opens (the title). */
  titleRef?: Ref<View>
}

const labelled = (label: string, value: string) => [label, value].join(" : ")

/**
 * The sources and licence view (32-UI-SPEC S4, D-03, ROADMAP criterion 2), as grouped content
 * (brief B-I3): the lead, one container per document (its title, then authors, publisher, year and
 * what it was used for, each a caption over its value and one accessible element reading "label :
 * value"), the precedence of the IBP thresholds in the tinted callout, then the statement of the
 * association's own drawings and that the guide works offline as plain lines. Plain text only: no
 * link, no web address, no opener, nothing fetched (T-32-29). A leaf view hosted by the shell.
 */
export function DmhSourcesPage({ titleRef }: DmhSourcesPageProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const hasDrawings = Object.keys(DMH_DRAWINGS).length > 0

  const row = (label: string, value: string) => (
    <View
      key={label}
      style={styles.documentRow}
      accessible
      accessibilityLabel={labelled(label, value)}
    >
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.bodyText}>{value}</Text>
    </View>
  )

  return (
    <View style={styles.page} testID="dmh-sources-page">
      <View ref={titleRef} accessible accessibilityRole="header">
        <Text style={styles.pageTitle} accessibilityRole="header">
          {t.title}
        </Text>
      </View>

      <Text style={styles.lead}>{t.lead}</Text>

      {t.documents.map((document) => (
        <AppGroupedContainer key={document.title}>
          <Text style={styles.documentTitle}>{document.title}</Text>
          {row(t.authors, document.authors)}
          {row(t.publisher, document.publisher)}
          {row(t.year, document.year)}
          {row(t.usedFor, document.usedFor)}
        </AppGroupedContainer>
      ))}

      <DmhCallout>
        <Text style={styles.calloutRule}>{t.precedence}</Text>
      </DmhCallout>

      <View style={styles.sourcesFoot}>
        {hasDrawings ? <Text style={styles.meta}>{t.drawings}</Text> : null}
        <Text style={styles.meta}>{t.offline}</Text>
        <Text style={styles.meta}>{t.consulted}</Text>
      </View>
    </View>
  )
}
