// OA-08: the welcome shown once, right after the profile is created.
export const welcomeFr = {
  eyebrow: "BIENVENUE",
  title: ({ name }: { name: string }) => `Bienvenue, ${name} !`,
  titleNoName: "Bienvenue !",
  body: "Votre profil est prêt. La forêt vous attend pour vos premiers relevés.",
  start: "C'est parti",
} as const
