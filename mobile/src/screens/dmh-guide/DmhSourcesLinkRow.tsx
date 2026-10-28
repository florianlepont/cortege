import { AppGroupedList } from "../../ui/AppGroupedList"
import { fr } from "../../i18n"

type DmhSourcesLinkRowProps = {
  onPress: () => void
}

/**
 * Phase 32 (redesign B-C2 item 8 and B-I2): "Sources et licence" as a one-row group (document tile,
 * label, chevron), at the foot of the catalogue and of every group page. Keeps the test id
 * `dmh-sources-link` the contract names.
 */
export function DmhSourcesLinkRow({ onPress }: DmhSourcesLinkRowProps) {
  return (
    <AppGroupedList
      sections={[
        {
          key: "sources",
          rows: [
            {
              key: "sources-link",
              label: fr.dmhGuide.sheet.sourcesLink,
              icon: "document-text-outline",
              onPress,
              testID: "dmh-sources-link",
            },
          ],
        },
      ]}
    />
  )
}
