import { Ref, useMemo } from "react"
import { View } from "react-native"
import { DMH_DRAWINGS } from "../../app/dmh-guide/drawings"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppNotice } from "../../ui/AppNotice"
import { AppText as Text } from "../../ui/AppText"
import { createDmhGuideStyles } from "./dmh-guide.styles"

const t = fr.dmhGuide.sources

type DmhSourcesPageProps = {
  /** The focus target of the shell when this view opens (the title). */
  titleRef?: Ref<View>
}

const labelled = (label: string, value: string) => [label, value].join(" : ")

/**
 * The sources and licence view (32-UI-SPEC S4, D-03, ROADMAP criterion 2): the three documents
 * the guide was written from, what each was used for, the precedence of the IBP thresholds, the
 * statement of the association's own drawings, and that the guide works offline. Plain text only:
 * no link, no web address, no opener, nothing fetched (T-32-29). A leaf view hosted by the shell
 * (plan 32-13).
 */
export function DmhSourcesPage({ titleRef }: DmhSourcesPageProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDmhGuideStyles(theme), [theme])
  const hasDrawings = Object.keys(DMH_DRAWINGS).length > 0

  return (
    <View style={styles.page} testID="dmh-sources-page">
      <View ref={titleRef} accessible accessibilityRole="header">
        <Text style={styles.pageTitle} accessibilityRole="header">
          {t.title}
        </Text>
      </View>

      <AppCard variant="glass" style={styles.block}>
        <Text style={styles.bodyText}>{t.lead}</Text>
      </AppCard>

      {t.documents.map((document) => (
        <AppCard key={document.title} variant="glass" style={styles.block}>
          <Text style={styles.blockTitle}>{document.title}</Text>
          <Text style={styles.documentLine}>{labelled(t.authors, document.authors)}</Text>
          <Text style={styles.documentLine}>{labelled(t.publisher, document.publisher)}</Text>
          <Text style={styles.documentLine}>{labelled(t.year, document.year)}</Text>
          <Text style={styles.documentLine}>{labelled(t.usedFor, document.usedFor)}</Text>
        </AppCard>
      ))}

      <AppNotice tone="info" message={t.precedence} />

      {hasDrawings ? (
        <AppCard variant="glass" style={styles.block}>
          <Text style={styles.bodyText}>{t.drawings}</Text>
        </AppCard>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.meta}>{t.offline}</Text>
        <Text style={styles.meta}>{t.consulted}</Text>
      </View>
    </View>
  )
}
