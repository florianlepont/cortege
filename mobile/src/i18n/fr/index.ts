import { accountFr } from "./account"
import { authGateFr } from "./auth-gate"
import { commonFr } from "./common"
import { componentsFr } from "./components"
import { factorDetailFr } from "./factor-detail"
import { factorInputFr } from "./factor-input"
import { factorPagerFr } from "./factor-pager"
import { homeFr } from "./home"
import { ibpMethodFr } from "./ibp-method"
import { labelsFr } from "./labels"
import { navigationFr } from "./navigation"
import { nearbyParcelsSheetFr } from "./nearby-parcels-sheet"
import { offlineMapFr } from "./offline-map"
import { ownerConflictFr } from "./owner-conflict"
import { parcelHistoryFr } from "./parcel-history"
import { parcelSelectionFr } from "./parcel-selection"
import { profileSetupFr } from "./profile-setup"
import { publicMapFr } from "./public-map"
import { settingsFr } from "./settings"
import { statusFr } from "./status"
import { surveyDetailFr } from "./survey-detail"
import { surveyExportFr } from "./survey-export"
import { surveyFormFr } from "./survey-form"
import { surveyListFr } from "./survey-list"
import { syncErrorsFr } from "./sync-errors"
import { validationFr } from "./validation"

// The French catalogue (D-06): one section per file, so each plan fills its own
// section without editing a shared one. No i18n library: property access is
// checked by the compiler.
export const fr = {
  common: commonFr,
  syncErrors: syncErrorsFr,
  navigation: navigationFr,
  nearbyParcelsSheet: nearbyParcelsSheetFr,
  home: homeFr,
  components: componentsFr,
  surveyList: surveyListFr,
  surveyDetail: surveyDetailFr,
  surveyExport: surveyExportFr,
  surveyForm: surveyFormFr,
  factorDetail: factorDetailFr,
  factorInput: factorInputFr,
  factorPager: factorPagerFr,
  parcelSelection: parcelSelectionFr,
  parcelHistory: parcelHistoryFr,
  profileSetup: profileSetupFr,
  ownerConflict: ownerConflictFr,
  settings: settingsFr,
  labels: labelsFr,
  ibpMethod: ibpMethodFr,
  authGate: authGateFr,
  account: accountFr,
  publicMap: publicMapFr,
  offlineMap: offlineMapFr,
  validation: validationFr,
  status: statusFr,
} as const

// Maps string literal types to string, recursively, and keeps function types, so
// a second language would be written as `const en: Catalog = { ... }`.
type Widen<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends string
    ? string
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T

export type Catalog = Widen<typeof fr>
