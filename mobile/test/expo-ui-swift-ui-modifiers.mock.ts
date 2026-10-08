// The real modifiers are plain `{ $type, ...params }` records handed to the native view (their
// `createModifier`); the mock builds the same records with the same parameter names, so a test can
// assert `buttonStyle("glassProminent")`, the tint colour, `disabled` and the rest.
type Modifier = { $type: string; [key: string]: unknown }

function createModifier(type: string, params: Record<string, unknown> = {}): Modifier {
  return { $type: type, ...params }
}

export const buttonStyle = (style: string) => createModifier("buttonStyle", { style })
export const tint = (color: string) => createModifier("tint", { tint: { type: "color", color } })
export const controlSize = (size: string) => createModifier("controlSize", { size })
export const disabled = (value: boolean = true) => createModifier("disabled", { disabled: value })
export const frame = (params: Record<string, unknown>) => createModifier("frame", params)
export const font = (params: Record<string, unknown>) => createModifier("font", params)
export const foregroundStyle = (color: string) =>
  createModifier("foregroundStyle", { style: { type: "color", color } })
export const accessibilityLabel = (label: string) => createModifier("accessibilityLabel", { label })
export const accessibilityHidden = (hidden: boolean = true) =>
  createModifier("accessibilityHidden", { hidden })
export const lineLimit = (limit?: number) => createModifier("lineLimit", { limit })
export const minimumScaleFactor = (factor: number) =>
  createModifier("minimumScaleFactor", { factor })
