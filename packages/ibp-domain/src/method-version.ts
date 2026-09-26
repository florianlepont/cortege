/** IBP FR v3.0 (CNPF, 2023-03-23): the rules every survey recorded before phase 01.8 follows. */
export const IBP_METHOD_V3_0 = "cnpf_ibp_fr_v3_0_2023-03-23" as const

/** IBP FR v3.2 (CNPF, 2026-02-02): the default for new surveys (ADR-003, D-01). */
export const IBP_METHOD_V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02" as const

export const IBP_METHOD_VERSIONS = [IBP_METHOD_V3_0, IBP_METHOD_V3_2] as const

export type IbpMethodVersion = (typeof IBP_METHOD_VERSIONS)[number]

export const DEFAULT_IBP_METHOD_VERSION: IbpMethodVersion = IBP_METHOD_V3_2

function isIbpMethodVersion(value: unknown): value is IbpMethodVersion {
  return (IBP_METHOD_VERSIONS as readonly unknown[]).includes(value)
}

/**
 * The method version a survey follows. A missing version (null, undefined or "") is v3.0 (D-02):
 * every survey recorded before the version existed. Any other unknown value is unsupported: null.
 */
export function resolveMethodVersion(raw: unknown): IbpMethodVersion | null {
  if (raw === undefined || raw === null || raw === "") {
    return IBP_METHOD_V3_0
  }
  return isIbpMethodVersion(raw) ? raw : null
}

/**
 * Compares two stored or sent versions after resolving them, so a missing version and the v3.0
 * tag are the same method. An unsupported value never matches anything.
 */
export function isSameMethodVersion(a: unknown, b: unknown): boolean {
  const left = resolveMethodVersion(a)
  return left !== null && left === resolveMethodVersion(b)
}
