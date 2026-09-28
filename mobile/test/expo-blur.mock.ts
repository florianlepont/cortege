import React from "react"

// Jest cannot render the native blur view; renders a plain host element carrying the same props
// and children, so a caller's layout (style, children) still shows up in a rendered tree.
export function BlurView(props: Record<string, unknown>) {
  return React.createElement("BlurView", props, props["children"] as React.ReactNode)
}
