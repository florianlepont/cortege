/**
 * The history of the demo surveys (seed-demo-community.js, Phase 24 owner testing): every demo
 * parcel gets several surveys over consecutive years, so the parcel history page, the trend curve,
 * the per-factor changes and the mixed-method cut have something to show.
 *
 * Pure planning only (no database, no network, no IBP rule): the seed script turns a plan into
 * factors and scores. Unit-tested in api/test/seed-demo-history.spec.ts.
 */

/** First and last year of the demo history; the last one stops before today (2026-10-09). */
const FIRST_YEAR = 2018
const LAST_YEAR = 2026
/** Surveys per site: 3 to 8 over consecutive years, 5 on average. */
const MIN_PER_SITE = 3
const MAX_PER_SITE = 8
const AVERAGE_PER_SITE = 5
/** Survey months are 0-based (2 = March); in LAST_YEAR the season stops at the end of September. */
const FIRST_MONTH = 2
const MONTHS_PER_YEAR = 8
const MONTHS_IN_LAST_YEAR = 7

const METHOD_V3_0 = "v3.0"
const METHOD_V3_2 = "v3.2"

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

/** How many sites a run needs for `count` surveys (about 5 each), within [1, maxSites]. */
function siteTotalFor(count, maxSites) {
  const wanted = Math.max(Math.ceil(count / MAX_PER_SITE), Math.round(count / AVERAGE_PER_SITE))
  return clamp(wanted, 1, maxSites)
}

/**
 * Splits `count` surveys over `siteTotal` sites: an even share, then random moves of one survey
 * from a site to another while every site stays within [MIN_PER_SITE, MAX_PER_SITE] (or around
 * its even share when `count` is too small for the minimum). The total is always `count`.
 */
function distributeCounts(count, siteTotal, random) {
  const base = Math.floor(count / siteTotal)
  const extra = count - base * siteTotal
  const counts = Array.from({ length: siteTotal }, (_, index) => base + (index < extra ? 1 : 0))
  const low = Math.min(MIN_PER_SITE, base)
  const high = Math.max(MAX_PER_SITE, base + 1)
  if (siteTotal < 2) return counts
  for (let move = 0; move < siteTotal * 3; move += 1) {
    const from = Math.floor(random() * siteTotal)
    const to = Math.floor(random() * siteTotal)
    if (from !== to && counts[from] > low && counts[to] < high) {
      counts[from] -= 1
      counts[to] += 1
    }
  }
  return counts
}

/**
 * One site's surveys, oldest first, on consecutive years ending in 2025 (70%) or 2026 (30%):
 *  - quality drifts from a starting level with a yearly slope (mostly up, sometimes down) and a
 *    little noise, so curves differ from one parcel to the next;
 *  - about 30% of the sites switch method on the way (the older surveys follow v3.0, the later
 *    ones v3.2: the curve is cut), 5% stay on v3.0, the others are all v3.2.
 * `random` is the site's own seeded random, so a dropped site never shifts the others.
 */
function planSiteHistory(count, random) {
  const endYear = random() < 0.3 ? LAST_YEAR : LAST_YEAR - 1
  const startYear = Math.max(FIRST_YEAR, endYear - count + 1)
  const start = 0.1 + random() * 0.6
  const slope = -0.04 + random() * 0.12
  const roll = random()
  let v30Count = 0
  if (roll < 0.3 && count >= 2) v30Count = 1 + Math.floor(random() * (count - 1))
  else if (roll < 0.35) v30Count = count
  return Array.from({ length: count }, (_, index) => {
    const year = startYear + index
    const months = year === LAST_YEAR ? MONTHS_IN_LAST_YEAR : MONTHS_PER_YEAR
    return {
      year,
      month: FIRST_MONTH + Math.floor(random() * months),
      day: 1 + Math.floor(random() * 27),
      hour: 9 + Math.floor(random() * 8),
      quality: Number(clamp(start + slope * index + (random() - 0.5) * 0.1, 0.05, 0.97).toFixed(3)),
      method: index < v30Count ? METHOD_V3_0 : METHOD_V3_2,
    }
  })
}

/**
 * The owner's 20 surveys (6 drafts, 14 finished), on the 6 owner sites (index into OWNER_PLACES).
 * Three parcels switch method on the way (Vincennes, Notre-Dame, Sénart: v3.0 first, then v3.2),
 * the Bois de Boulogne has three finished years, Fontainebleau a decline, and Rambouillet is the
 * first finished survey on its parcel. Months are 0-based.
 */
const OWNER_PLAN = [
  // Notre-Dame: v3.0 then v3.2, then a draft of 2026.
  {
    name: "Chênaie du Bois Joli",
    site: 0,
    status: "submitted",
    visibility: "private",
    quality: 0.25,
    kept: 10,
    year: 2024,
    month: 5,
    day: 14,
    method: METHOD_V3_0,
  },
  {
    name: "Chênaie du Bois Joli",
    site: 0,
    status: "submitted",
    visibility: "private",
    quality: 0.4,
    kept: 10,
    year: 2025,
    month: 5,
    day: 20,
    method: METHOD_V3_2,
  },
  {
    name: "Chênaie du Bois Joli",
    site: 0,
    status: "draft",
    visibility: "private",
    quality: 0.3,
    kept: 3,
    year: 2026,
    month: 3,
    day: 4,
    method: METHOD_V3_2,
  },
  // Vincennes: v3.0 in 2023 and 2024, v3.2 in 2025, then a draft of 2026.
  {
    name: "Lisière de la Marne",
    site: 1,
    status: "submitted",
    visibility: "public",
    quality: 0.3,
    kept: 10,
    year: 2023,
    month: 4,
    day: 9,
    method: METHOD_V3_0,
  },
  {
    name: "Lisière de la Marne",
    site: 1,
    status: "submitted",
    visibility: "public",
    quality: 0.45,
    kept: 10,
    year: 2024,
    month: 5,
    day: 11,
    method: METHOD_V3_0,
  },
  {
    name: "Lisière de la Marne",
    site: 1,
    status: "submitted",
    visibility: "public",
    quality: 0.55,
    kept: 10,
    year: 2025,
    month: 6,
    day: 3,
    method: METHOD_V3_2,
  },
  {
    name: "Lisière de la Marne",
    site: 1,
    status: "draft",
    visibility: "private",
    quality: 0.5,
    kept: 6,
    year: 2026,
    month: 4,
    day: 12,
    method: METHOD_V3_2,
  },
  // Bois de Boulogne: three finished years, all v3.2, then a draft of another stand.
  {
    name: "Pinède des Sables",
    site: 2,
    status: "submitted",
    visibility: "public",
    quality: 0.5,
    kept: 10,
    year: 2024,
    month: 5,
    day: 18,
    method: METHOD_V3_2,
  },
  {
    name: "Pinède des Sables",
    site: 2,
    status: "submitted",
    visibility: "public",
    quality: 0.65,
    kept: 10,
    year: 2025,
    month: 6,
    day: 25,
    method: METHOD_V3_2,
  },
  {
    name: "Pinède des Sables",
    site: 2,
    status: "submitted",
    visibility: "public",
    quality: 0.8,
    kept: 10,
    year: 2026,
    month: 4,
    day: 20,
    method: METHOD_V3_2,
  },
  {
    name: "Taillis du Plateau",
    site: 2,
    status: "draft",
    visibility: "private",
    quality: 0.2,
    kept: 2,
    year: 2026,
    month: 7,
    day: 6,
    method: METHOD_V3_2,
  },
  // Fontainebleau: a decline between 2025 and 2026, plus a draft.
  {
    name: "Ripisylve de l'Yerres",
    site: 3,
    status: "submitted",
    visibility: "public",
    quality: 0.7,
    kept: 10,
    year: 2025,
    month: 7,
    day: 8,
    method: METHOD_V3_2,
  },
  {
    name: "Ripisylve de l'Yerres",
    site: 3,
    status: "submitted",
    visibility: "public",
    quality: 0.55,
    kept: 10,
    year: 2026,
    month: 5,
    day: 15,
    method: METHOD_V3_2,
  },
  {
    name: "Parcelle de la source",
    site: 3,
    status: "draft",
    visibility: "private",
    quality: 0.6,
    kept: 9,
    year: 2026,
    month: 6,
    day: 2,
    method: METHOD_V3_2,
  },
  // Rambouillet: the first finished survey on its parcel, plus a draft.
  {
    name: "Chênaie de la Mare",
    site: 4,
    status: "submitted",
    visibility: "private",
    quality: 0.9,
    kept: 10,
    year: 2026,
    month: 4,
    day: 26,
    method: METHOD_V3_2,
  },
  {
    name: "Futaie des Gaillardes",
    site: 4,
    status: "draft",
    visibility: "private",
    quality: 0.7,
    kept: 8,
    year: 2026,
    month: 7,
    day: 22,
    method: METHOD_V3_2,
  },
  // Sénart: v3.0 in 2024, v3.2 in 2025 and 2026, plus a draft.
  {
    name: "Taillis de l'Étang",
    site: 5,
    status: "submitted",
    visibility: "public",
    quality: 0.35,
    kept: 10,
    year: 2024,
    month: 8,
    day: 5,
    method: METHOD_V3_0,
  },
  {
    name: "Taillis de l'Étang",
    site: 5,
    status: "submitted",
    visibility: "public",
    quality: 0.45,
    kept: 10,
    year: 2025,
    month: 8,
    day: 17,
    method: METHOD_V3_2,
  },
  {
    name: "Taillis de l'Étang",
    site: 5,
    status: "submitted",
    visibility: "public",
    quality: 0.5,
    kept: 10,
    year: 2026,
    month: 5,
    day: 3,
    method: METHOD_V3_2,
  },
  {
    name: "Hêtraie de la Butte",
    site: 5,
    status: "draft",
    visibility: "private",
    quality: 0.4,
    kept: 5,
    year: 2026,
    month: 7,
    day: 14,
    method: METHOD_V3_2,
  },
]

module.exports = {
  AVERAGE_PER_SITE,
  FIRST_YEAR,
  LAST_YEAR,
  MAX_PER_SITE,
  METHOD_V3_0,
  METHOD_V3_2,
  MIN_PER_SITE,
  OWNER_PLAN,
  distributeCounts,
  planSiteHistory,
  siteTotalFor,
}
