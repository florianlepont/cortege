import { useMemo, useState } from "react"
import { CNPF_FACTOR_A_GENUS_CODES, type CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { parseGenusListValue, toggleGenusInListValue } from "../../app/factor-a-genus-list"
import { sortGenusCodes } from "../../app/genus-order"
import { foldSearchText, normalizeSearchQuery } from "../../app/search-text"
import { fr } from "../../i18n"
import { ChoiceList, type ChoiceOption } from "../../ui/choice-list/ChoiceList"
import { ChoiceSearchField } from "../../ui/choice-list/ChoiceSearchField"

const t = fr.factorDetail.choice.search

type Entry = ChoiceOption & { folded: string }

/**
 * Display order, computed once: Latin name, accent-insensitive (decision D-06). The label is Latin
 * first, French name in parentheses (D-10); the search reads both, folded.
 */
const ENTRIES: readonly Entry[] = sortGenusCodes(CNPF_FACTOR_A_GENUS_CODES).map((code) => {
  const label = fr.genus.latinLabel(code)
  return { value: code, label, folded: foldSearchText(label) }
})

type GenusChoiceProps = {
  title: string
  /** Comma-joined CNPF genus codes, the shape `FactorField.value` uses everywhere. */
  value: string
  onChange: (nextValue: string) => void
  touched: boolean
  onTouch: () => void
  error?: string | null
}

/**
 * Factor A's genus list in the grouped look (follow-up 32-30): up to 34 genera as a multi-select
 * list under a search field. The search narrows what is listed (accents and case ignored, Latin or
 * French name); it never changes the selection, and the list keeps the Latin order, selected or
 * not. The header sums up how many are ticked, matches or not. A recognition suggestion
 * (`FactorAGenusRecognitionEntry`) still writes straight into the same string value.
 */
export function GenusChoice({ title, value, onChange, touched, onTouch, error }: GenusChoiceProps) {
  const [query, setQuery] = useState("")
  const selected = useMemo(() => new Set(parseGenusListValue(value)), [value])
  const needle = foldSearchText(normalizeSearchQuery(query))
  const options = useMemo(
    () => (needle === "" ? ENTRIES : ENTRIES.filter((entry) => entry.folded.includes(needle))),
    [needle],
  )

  const toggle = (genus: string): void => {
    onChange(toggleGenusInListValue(value, genus as CnpfFactorAGenusCode))
    onTouch()
  }

  return (
    <ChoiceList
      factor="A"
      testID="choice-list-A"
      title={title}
      mode="multi"
      options={options}
      selected={selected}
      onChoose={toggle}
      countText={fr.factorInput.chips.selectedCount({ count: selected.size })}
      error={touched && error ? error : null}
      emptyText={t.empty}
      above={
        <ChoiceSearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t.placeholder}
          a11yLabel={t.a11yLabel}
          clearLabel={t.clear}
          testID="choice-search-A"
        />
      }
    />
  )
}
