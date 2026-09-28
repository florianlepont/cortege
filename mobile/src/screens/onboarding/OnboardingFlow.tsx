import { useState } from "react"
import { markOnboardingSeen } from "../../storage/onboarding-preference"
import { OnboardingCarouselScreen } from "./OnboardingCarouselScreen"
import { PermissionsPrimingScreen } from "./PermissionsPrimingScreen"

type OnboardingStep = "carousel" | "permissions"

type OnboardingFlowProps = {
  onDone: () => void
}

/**
 * ONB-01: the carousel, then the permissions-priming screen. "Passer" on the carousel skips the
 * whole flow (including permissions priming) — a returning-later prompt for location/camera comes
 * naturally the first time a screen actually needs it. Either path marks the flow seen so it never
 * runs again.
 */
export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("carousel")

  const finishFlow = (): void => {
    void markOnboardingSeen()
    onDone()
  }

  if (step === "carousel") {
    return <OnboardingCarouselScreen onSkip={finishFlow} onFinish={() => setStep("permissions")} />
  }

  return <PermissionsPrimingScreen onDone={finishFlow} />
}
