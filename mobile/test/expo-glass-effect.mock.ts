import React from "react"

// Jest has no native Liquid Glass view: a plain host element that keeps props and children, and the
// effect reported unavailable so components render their blur fallback.
export function GlassView(props: Record<string, unknown>) {
  return React.createElement("GlassView", props, props["children"] as React.ReactNode)
}

export function GlassContainer(props: Record<string, unknown>) {
  return React.createElement("GlassContainer", props, props["children"] as React.ReactNode)
}

export function isLiquidGlassAvailable(): boolean {
  return false
}
