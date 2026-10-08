import type { NativeStackHeaderItem } from "@react-navigation/native-stack"
import { HeaderLeftTitle } from "../ui/HeaderLeftTitle"

/**
 * OA-85: the native iOS header items of Accueil and Mes Relevés. iOS 26 draws the glass around
 * header items itself, so the title asks for none (`hidesSharedBackground`) and the buttons are bare
 * icons: no circle of our own inside the system's. Since 12.2-17 the title item is Accueil's
 * greeting only: Mes Relevés is named by the native large title.
 */
export function titleHeaderItems(title: string): NativeStackHeaderItem[] {
  return [
    { type: "custom", element: <HeaderLeftTitle title={title} />, hidesSharedBackground: true },
  ]
}

export function iconHeaderButton(options: {
  label: string
  sfSymbol: "plus" | "person.crop.circle"
  tintColor: string
  onPress: () => void
}): NativeStackHeaderItem {
  return {
    type: "button",
    label: options.label,
    icon: { type: "sfSymbol", name: options.sfSymbol },
    tintColor: options.tintColor,
    onPress: options.onPress,
  }
}
