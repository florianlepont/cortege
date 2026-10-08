import type { ReactTestInstance } from "react-test-renderer"

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null | false) || {}
}

/**
 * The style a user sees on an `AppPressable` host node in a test tree: the `Pressable`'s own
 * (placement and size) merged with the first child's (the scaling inner view, which carries the
 * fill, border, padding and radius). A plain `Pressable` has no wrapper, so the first child is
 * simply a child with its own style and only fills in the keys missing on the host; callers use
 * it on `AppPressable` hosts only.
 */
export function pressableLook(node: ReactTestInstance): Style {
  const inner = node.children[0]
  const innerStyle =
    inner && typeof inner !== "string" ? flatten((inner as ReactTestInstance).props.style) : {}
  return { ...flatten(node.props.style), ...innerStyle }
}
