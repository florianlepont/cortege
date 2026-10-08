import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { darkenPlanIgnStyle } from "./dark-style"
import { PLAN_IGN_STYLE_URL } from "./styles"

export type StyleFetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

let published: Promise<StyleSpecification> | null = null

/** The published Plan IGN style (online), fetched once per app run. */
export function fetchPlanIgnStyle(
  fetchImpl: StyleFetch = fetch as unknown as StyleFetch,
): Promise<StyleSpecification> {
  if (published === null) {
    published = (async () => {
      const response = await fetchImpl(PLAN_IGN_STYLE_URL)
      if (!response.ok) throw new Error("plan-ign-style: the Plan IGN style could not be fetched")
      return (await response.json()) as StyleSpecification
    })()
    published.catch(() => {
      published = null
    })
  }
  return published
}

/** The dark recolouring of the published Plan IGN style. */
export async function fetchDarkPlanIgnStyle(fetchImpl?: StyleFetch): Promise<StyleSpecification> {
  return darkenPlanIgnStyle(await fetchPlanIgnStyle(fetchImpl))
}

/** Test helper: forgets the cached style. */
export function resetPlanIgnStyleCache(): void {
  published = null
}
