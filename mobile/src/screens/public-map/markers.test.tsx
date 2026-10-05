/**
 * Memoised map markers (D-05, D-07): a parent re-render with the same props does
 * not re-render a marker, the callbacks receive ids, and the accessibility
 * labels come from the catalogue with scores and counts only (T-01.9-50).
 */
import React, { useState } from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { PublicMapItem } from "../../app/types"
import { brandMapTokens } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { ClusterListSheet } from "./ClusterListSheet"
import { ClusterMarker } from "./ClusterMarker"
import { MapTopControls } from "./MapControls"
import { SelectedSurveyCard } from "./SelectedSurveyCard"
import { SurveyMarker } from "./SurveyMarker"

const mockMarkerRenders: { count: number } = { count: 0 }

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
  }
})

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, trailing }: { title: string; trailing?: React.ReactNode }) =>
      ReactRef.createElement("AppSectionHeader", { title }, trailing),
  }
})

jest.mock("@maplibre/maplibre-react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ViewAnnotation: ({ children, ...props }: { children?: React.ReactNode }) => {
      mockMarkerRenders.count += 1
      return ReactRef.createElement("ViewAnnotation", props, children)
    },
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockMarkerRenders.count = 0
})

const COORDINATE = { latitude: 45.76, longitude: 4.84 }

function mount(element: React.ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element)
  })
  return tree as ReactTestRenderer
}

function markerProps(tree: ReactTestRenderer) {
  return tree.root.findByType("ViewAnnotation" as never).props as Record<string, unknown>
}

// The label is on the drawn pastille or bubble inside the annotation, where a screen reader lands.
function markerLabel(tree: ReactTestRenderer): string {
  return String(tree.root.findByType("View" as never).props.accessibilityLabel)
}

describe("SurveyMarker", () => {
  test("does not re-render when its parent re-renders with identical props", () => {
    const onSelect = jest.fn()
    let bump: () => void = () => undefined
    function Parent() {
      const [tick, setTick] = useState(0)
      bump = () => setTick((value) => value + 1)
      return (
        <>
          <SurveyMarker
            id="s-1"
            // A new object with the same values on each render, as the cluster list builds it.
            coordinate={{ ...COORDINATE }}
            ibpTotal={30}
            selected={false}
            onSelect={onSelect}
          />
          {tick >= 0 ? null : null}
        </>
      )
    }

    mount(<Parent />)
    expect(mockMarkerRenders.count).toBe(1)
    act(() => bump())
    act(() => bump())
    expect(mockMarkerRenders.count).toBe(1)
  })

  test("re-renders when the selection or the position changes", () => {
    const onSelect = jest.fn()
    const tree = mount(
      <SurveyMarker
        id="s-1"
        coordinate={COORDINATE}
        ibpTotal={30}
        selected={false}
        onSelect={onSelect}
      />,
    )
    act(() => {
      tree.update(
        <SurveyMarker
          id="s-1"
          coordinate={COORDINATE}
          ibpTotal={30}
          selected
          onSelect={onSelect}
        />,
      )
    })
    act(() => {
      tree.update(
        <SurveyMarker
          id="s-1"
          coordinate={{ latitude: 45.77, longitude: 4.84 }}
          ibpTotal={30}
          selected
          onSelect={onSelect}
        />,
      )
    })
    expect(mockMarkerRenders.count).toBe(3)
    expect(markerProps(tree).selected).toBe(true)
  })

  test("passes its id to onSelect and labels itself with the score, not the id", () => {
    const onSelect = jest.fn()
    const tree = mount(
      <SurveyMarker
        id="s-42"
        coordinate={COORDINATE}
        ibpTotal={27}
        selected={false}
        onSelect={onSelect}
      />,
    )
    const props = markerProps(tree)
    ;(props.onPress as () => void)()
    expect(onSelect).toHaveBeenCalledWith("s-42")
    expect(markerLabel(tree)).toBe(fr.publicMap.a11y.surveyMarker(27))
    expect(markerLabel(tree)).not.toContain("s-42")
    // MapLibre positions by [longitude, latitude].
    expect(props.lngLat).toEqual([COORDINATE.longitude, COORDINATE.latitude])
  })

  // MAP-03: the pastille is coloured by the IBP total's score band, not a single system pin color.
  test.each([
    [5, "low"],
    [25, "mid"],
    [45, "high"],
  ] as const)("an IBP total of %i colours the pastille %s", (ibpTotal, tone) => {
    const tree = mount(
      <SurveyMarker
        id="s-1"
        coordinate={COORDINATE}
        ibpTotal={ibpTotal}
        selected={false}
        onSelect={jest.fn()}
      />,
    )
    const pastille = tree.root.findByType("View" as never)
    const flatStyle = [pastille.props.style].flat(2)
    expect(flatStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: brandMapTokens.scoreMarker[tone] }),
      ]),
    )
  })

  test("a selected marker's pastille carries the selected style", () => {
    const tree = mount(
      <SurveyMarker id="s-1" coordinate={COORDINATE} ibpTotal={30} selected onSelect={jest.fn()} />,
    )
    const pastille = tree.root.findByType("View" as never)
    const flatStyle = [pastille.props.style].flat(2)
    expect(flatStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderColor: brandMapTokens.scoreMarkerSelectedBorder }),
      ]),
    )
  })
})

describe("ClusterMarker", () => {
  test("renders a count label and its count", () => {
    const onPress = jest.fn()
    const tree = mount(
      <ClusterMarker clusterId={7} coordinate={COORDINATE} count={12} onPress={onPress} />,
    )
    const props = markerProps(tree)
    expect(markerLabel(tree)).toBe(fr.publicMap.a11y.cluster(12))
    expect(markerLabel(tree)).toBe("Groupe de 12 relevés")
    expect(tree.root.findByType("Text" as never).props.children).toBe("12")
    ;(props.onPress as () => void)()
    expect(onPress).toHaveBeenCalledWith(7)
  })

  test("caps the displayed count and does not re-render on identical props", () => {
    const onPress = jest.fn()
    const tree = mount(
      <ClusterMarker clusterId={8} coordinate={COORDINATE} count={150} onPress={onPress} />,
    )
    expect(tree.root.findByType("Text" as never).props.children).toBe("99+")
    act(() => {
      tree.update(
        <ClusterMarker
          clusterId={8}
          coordinate={{ ...COORDINATE }}
          count={150}
          onPress={onPress}
        />,
      )
    })
    expect(mockMarkerRenders.count).toBe(1)
  })
})

function makeItem(overrides: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    survey_id: "s-9",
    display_location: { lat: 45.76, lng: 4.84 },
    survey_date: "2026-05-01",
    region_code: "ARA",
    ibp_total: 12,
    ...overrides,
  }
}

function texts(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
}

function renderCard(item: PublicMapItem): ReactTestRenderer {
  return mount(
    <SelectedSurveyCard
      item={item}
      isOwnSurvey={false}
      onOpenSurvey={jest.fn()}
      onClose={jest.fn()}
    />,
  )
}

describe("IBP totals out of 50 and the method on the map (01.8 D-03, D-10)", () => {
  test("marker, cluster row and selected card titles read the total out of 50", () => {
    expect(fr.publicMap.a11y.surveyMarker(12)).toContain("IBP 12/50")
    expect(fr.publicMap.clusterList.row({ ibp: 12, date: "2026-05-01" })).toContain("IBP 12/50")
    expect(fr.publicMap.selected.title(12)).toContain("IBP 12/50")
    const marker = mount(
      <SurveyMarker
        id="s-1"
        coordinate={COORDINATE}
        ibpTotal={12}
        selected={false}
        onSelect={jest.fn()}
      />,
    )
    expect(markerLabel(marker)).toContain("IBP 12/50")
  })

  test("a v3.2 survey with a cas shows the method and the cas instead of the region", () => {
    const tree = renderCard(
      makeItem({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3, region_code: "unknown" }),
    )
    const header = tree.root.findByType("AppSectionHeader" as never)
    expect(header.props.title).toBe("Relevé · IBP 12/50")
    const shown = texts(tree)
    expect(shown).toContain("IBP v3.2")
    expect(shown).toContain(fr.publicMap.selected.meta({ region: "Cas 3", date: "2026-05-01" }))
    expect(shown.join(" ")).not.toContain("unknown")
    expect(shown.join(" ")).not.toContain("s-9")
  })

  test("a survey without method fields reads as v3.0 with its region", () => {
    const shown = texts(renderCard(makeItem()))
    expect(shown).toContain("IBP v3.0")
    expect(shown).toContain(fr.publicMap.selected.meta({ region: "ARA", date: "2026-05-01" }))
    const tagged = texts(
      renderCard(makeItem({ ibp_method_version: IBP_METHOD_V3_0, ibp_cas: null })),
    )
    expect(tagged).toContain("IBP v3.0")
  })

  test("the cluster list labels each row out of 50 with its cas or region", () => {
    const items = [
      makeItem({ survey_id: "s-1", ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 2 }),
      makeItem({ survey_id: "s-2", ibp_total: 30 }),
    ]
    const tree = mount(<ClusterListSheet items={items} onSelect={jest.fn()} onClose={jest.fn()} />)
    const labels = tree.root
      .findAll((node) => (node.type as unknown) === "Pressable")
      .map((node) => String(node.props.accessibilityLabel))
    expect(labels).toContain(
      fr.publicMap.a11y.clusterListItem({ ibp: 12, date: "2026-05-01", region: "Cas 2" }),
    )
    expect(labels).toContain(
      fr.publicMap.a11y.clusterListItem({ ibp: 30, date: "2026-05-01", region: "ARA" }),
    )
    expect(labels.filter((label) => label.includes("/50"))).toHaveLength(2)
    expect(labels.join(" ")).not.toMatch(/s-[12]/)
    const shown = texts(tree)
    expect(shown).toContain("Cas 2")
    expect(shown).toContain("ARA")
  })

  test("the region filter says it filters v3.0 surveys only", () => {
    const tree = mount(
      <MapTopControls
        top={0}
        count={3}
        loading={false}
        showFilters
        showParcelLayer={false}
        layerStatusLabel=""
        filters={{
          period: "all",
          onChangePeriod: jest.fn(),
          region: "",
          onChangeRegion: jest.fn(),
          mineOnly: false,
          onToggleMine: jest.fn(),
          activeCount: 0,
          onReset: jest.fn(),
        }}
        onToggleFilters={jest.fn()}
        onToggleParcelLayer={jest.fn()}
        onRefresh={jest.fn()}
      />,
    )
    expect(fr.publicMap.filters.regionHint).toBe("filtre les relevés v3.0 uniquement")
    expect(texts(tree)).toContain(fr.publicMap.filters.regionHint)
  })
})

describe("fr.publicMap", () => {
  test("uses singular and plural forms", () => {
    expect(fr.publicMap.count(0)).toBe("Aucun relevé")
    expect(fr.publicMap.count(1)).toBe("1 relevé")
    expect(fr.publicMap.count(3)).toBe("3 relevés")
    expect(fr.publicMap.a11y.cluster(1)).toBe("Groupe de 1 relevé")
    expect(fr.publicMap.clusterList.title(1)).toBe("1 relevé à cet endroit")
    expect(fr.publicMap.clusterList.title(4)).toBe("4 relevés à cet endroit")
  })
})
