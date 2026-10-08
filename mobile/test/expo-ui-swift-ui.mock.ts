import React from "react"

// Jest has no SwiftUI: each `@expo/ui/swift-ui` view is a plain host element named after the view,
// keeping its props (`modifiers`, `onPress`, `testID`, `label`, ...) and children, so a test can
// find the `Button`, read its modifiers and press it.
function hostElement(name: string) {
  function MockSwiftUiView(props: Record<string, unknown>) {
    return React.createElement(name, props, props["children"] as React.ReactNode)
  }
  MockSwiftUiView.displayName = `SwiftUI.${name}`
  return MockSwiftUiView
}

export const Host = hostElement("Host")
export const Button = hostElement("Button")
export const Text = hostElement("Text")
export const Image = hostElement("Image")
export const HStack = hostElement("HStack")
export const ProgressView = hostElement("ProgressView")
