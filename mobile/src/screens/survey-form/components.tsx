import { Ionicons } from "@expo/vector-icons"
import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { FactorKey } from "../../app/types"

export const FACTOR_ORDER: FactorKey[] = [...FACTOR_KEYS]
export const FACTOR_ICONS: Record<FactorKey, keyof typeof Ionicons.glyphMap> = {
  A: "leaf-outline",
  B: "layers-outline",
  C: "git-branch-outline",
  D: "reorder-three-outline",
  E: "resize-outline",
  F: "sparkles-outline",
  G: "flower-outline",
  H: "git-network-outline",
  I: "water-outline",
  J: "triangle-outline",
}
