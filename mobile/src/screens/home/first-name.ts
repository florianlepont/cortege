import type { AuthUser } from "../../app/types"

/** The name the Accueil greeting uses: first name, else the first word of the display name. */
export function getFirstName(user: AuthUser | null): string {
  if (!user) return ""
  return user.first_name?.trim() || user.display_name?.split(" ")[0] || ""
}
