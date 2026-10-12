# Météo-France DPObs v2 fixtures and spike findings (phase 27, plan 27-22)

Real responses of the Météo-France observation API (DPObs v2), captured by the owner on 2026-10-12
with `node --env-file=api/.env api/scripts/meteofrance-spike.mjs`. The files carry no credential and
no token. Plan 27-12 builds the real weather provider on these files and on the findings below.

Provenance tags used here: **observed** (visible in a file of this directory), **reported** (printed
by the capture script during the owner's run or reported by the owner, but not stored in a file),
**documented** (stated by `dpobs-v2.swagger.json` or by the research, not verified on a real answer),
**to be confirmed by the owner** (nothing was reported yet; no number is invented).

## Authentication

- Mode that worked (reported, script line `auth mode: bearer`): `Authorization: Bearer <token>`. The
  `apikey` header was refused by the provider ("Invalid Credentials").
- The credential the owner generated on the portal is a JWT valid **one hour** (reported, decision
  D-27), not a long-lived key. It is enough for captures and local trials, not for production.
- Production mode (D-27): the portal's **application id** exchanged for a bearer token (OAuth2 client
  credentials) at `https://portail-api.meteofrance.fr/token`, the token cached in memory and renewed
  before it expires, with one renewal on a `401`. The swagger declares an OAuth2 scheme (documented,
  authorization URL under `public-api.meteofrance.fr/authorize`) and no API-key scheme.
- The application id has **not been obtained yet**, so the application-id flow is **unverified against
  the real portal**. What was observed on the token endpoint (reported): a made-up id was answered
  `401` with the JSON body `{"error":"invalid_client"}`, and no firewall page when the request
  carries a normal `User-Agent`; a "Request Rejected" firewall page came back when the Basic value
  was a truncated JWT. Plan 27-12 builds this mode against a mocked token endpoint (D-27); the real
  end-to-end check waits for the application id (plan 27-21).
- The variable `METEOFRANCE_API_KEY` is the only credential variable. In production it holds the
  application id; in a local trial it may hold a ready one-hour token (bearer mode of the script).
  Its value never appears in a file, a log line or a fixture.

## Base URL and endpoints

Base URL (documented by the swagger `servers` entry, and the one the script called, observed):
`https://public-api.meteofrance.fr/public/DPObs/v2`.

| Endpoint                       | Used for                                             | Status                                                                          |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /liste-stations`          | The hourly stations: id, name, position, altitude    | Observed, answers **CSV only** (the JSON request returned no usable rows, D-30) |
| `GET /station/horaire`         | One hourly reading of one station                    | Observed, JSON                                                                  |
| `GET /synop`                   | SYNOP reports (sky, present weather, rain over 24 h) | Observed, JSON, about 190 stations (reported)                                   |
| `GET /liste-stations-synop`    | The SYNOP stations list                              | Documented only, **not captured**: see "Station density and Distance cap"       |
| `GET /station/infrahoraire-6m` | 6 minute readings                                    | Documented, not used in this phase                                              |

The swagger also lists the buoys and ships endpoints; they are out of scope. The swagger documents
`400` (parameters in error) and `404` (data set does not exist) for the hourly product, and says
that an **empty list** means an absent or unknown station (observed behaviour below: also a time
without data).

## Request parameters

| Endpoint          | Parameter                | Observed or documented                                                                                  | Value                                                  |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `station/horaire` | `id_station`             | required, 8 digits `DDCCCNNN` (department, commune, station), a string: keep the leading zeros          | `77186002`                                             |
| `station/horaire` | `date`                   | optional, observed accepted (`date_parameter` is `"date"` in the fixtures); default is the current time | ISO 8601 UTC `2026-10-12T04:00:00Z`                    |
| `station/horaire` | `format`                 | required                                                                                                | `json`, `csv`, `geojson` (documented); `json` observed |
| `synop`           | `format`                 | required                                                                                                | `json` observed                                        |
| `synop`           | `id_station`             | optional, WMO ids separated by commas (documented)                                                      | `07247,07292`                                          |
| `synop`           | `date_debut`, `date_fin` | optional (documented), format `AAAA-MM-JJTHH:mm:00Z`                                                    | not exercised: the capture asked without dates         |
| `liste-stations`  | `format`                 | `csv` observed to be the only usable answer                                                             | `csv`                                                  |

The `station/horaire` call needs the hour as a round UTC instant: the readings are produced at the
round hour (`validity_time`) and published about 10 minutes later (`reference_time`, `insert_time`).

## Fields and units

All times are ISO 8601 UTC with a trailing `Z`. A value the station does not measure is `null`.

| App field                        | Provider field                                           | Unit observed                                                       | Conversion                                                                                                                    | Notes                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `temperature_c`                  | `t` (hourly and SYNOP)                                   | Kelvin (observed: 275.45, 277.05, 288.85 at 04:00Z in October)      | `t - 273.15` (2.3, 3.9, 15.7 °C)                                                                                              | Always present in the 4 hourly readings                                                                                                    |
| `wind_kmh`                       | `ff` (hourly and SYNOP)                                  | m/s (SYNOP observed: 0 to 4.1)                                      | `ff * 3.6`                                                                                                                    | **`null` in 4 of 4 hourly readings** (also `dd`, `u`, `n`, `vv`, `pres` are `null` there); non-null in 10 of 10 SYNOP rows                 |
| `observed_at`                    | `validity_time`                                          | UTC instant of the round hour                                       | none                                                                                                                          | `reference_time` and `insert_time` are publication times, not used                                                                         |
| rain over 1 h (not an app field) | `rr1`                                                    | mm (0 in all readings)                                              | none                                                                                                                          | Hourly and SYNOP                                                                                                                           |
| `rain_24h_mm`                    | SYNOP `rr24`                                             | mm                                                                  | none; clamp a negative value to 0                                                                                             | Non-null in 10 of 10 SYNOP rows; one row holds `-0.1` (probably the code for a trace, not confirmed); the hourly product has no 24 h field |
| `sky`                            | SYNOP `n` (total cloud cover) and `ww` (present weather) | `n`: percent (observed 100); `ww`: WMO table 4677 code (observed 0) | map `ww` groups first (fog, rain, snow, thunderstorm), else cut `n` into the clear / partly cloudy / cloudy / overcast values | `n` non-null in 2 of 10 SYNOP rows, `ww` non-null in 9 of 10; the hourly product has `n` but it is `null` in 4 of 4 readings               |

Other SYNOP fields seen and not used: `nbas` (amount of the lowest cloud layer, oktas, it is not the
total cover), `nnuage1..4`, `hbas`, `rr3`, `rr6`, `rr12`, `pmer`, `tend`, `tn12`, `tx12`, `raf10`.
Hourly extras not used: `tx`, `tn` (extremes of the hour), `lat`, `lon` (position of the station in
the row), `geo_id_insee` (the station id). SYNOP rows carry `geo_id_wmo` (5 digits, a string) and
`name`.

## Retention

- Documented: the hourly product keeps 24 hours, and the research expected the **oldest** reading
  back for an older time. **Observed: that is wrong.** The 30 hour request
  (`station-horaire.old.json`, `requested_at` 2026-10-11T00:00:00Z, HTTP 200) returned the exact
  requested hour, `validity_time` equal to `requested_at`.
- Reported by the owner's run, not in a fixture: requests up to **96 hours** back returned the exact
  hour, and **108 hours and older returned an empty list** (not the oldest reading, not an error).
- Decision D-28: the catch-up window stays **24 hours** (D-20) although the API serves about 96
  hours. We do not rely on an undocumented behaviour; the observed 96 hours is recorded here for a
  later decision. The server still refuses a time older than 24 hours without calling the provider.
- The server still compares the reading's own `validity_time` with the requested time and drops a
  reading farther than the tolerance (90 minutes by default): an empty list, a reading of another
  hour or a missing station must never become the weather of the survey.

## Station density and Distance cap

Hourly stations: **2151** in the CSV list (columns `Id_station`, `Id_omm`, `Nom_usuel`, `Latitude`,
`Longitude`, `Altitude`, `Date_ouverture`, `Pack`). Distances are great-circle distances from the
three forest test points, taken from `liste-stations.excerpt.json` (observed).

| Test point                      | Nearest                      | 3rd nearest              | 5th nearest             | Within 25 km | Within 30 km |
| ------------------------------- | ---------------------------- | ------------------------ | ----------------------- | ------------ | ------------ |
| Fontainebleau (48.40, 2.70)     | 1.72 km (Fontainebleau SAPC) | 19.9 km (Milly-la-Forêt) | 24.16 km (Courdimanche) | 6            | 7            |
| Vosges, Gérardmer (48.07, 6.87) | 2.69 km (Gérardmer)          | 9.41 km (Vagney)         | 18.56 km (Munster SAPC) | 13           | 15 or more   |
| Landes, Mimizan (44.20, -1.23)  | 25.13 km (Labouheyre DFCI)   | 30.03 km (Sabres)        | 38.02 km (Cazaux)       | 0            | 2            |

In the table "3rd nearest" is the third row of the sorted list (the 2nd is 14.5 km, 8.73 km and
25.8 km). The excerpt keeps 15 stations per point, so the counts within a distance stop at 15.

**Distance cap for the hourly station (temperature, wind, rain over 1 h): 30 km**, proposed default
of `WEATHER_MAX_STATION_DISTANCE_KM` for plan 27-12 (D-19, D-29). Reason: forest sites sit away from
towns; a 25 km cap (the default D-29 wrote down) leaves the Landes point empty by 0.13 km, whereas
30 km covers it with two stations and keeps the two other points well inside (many stations within
25 km, so at most three are merged anyway). 40 km would start to give Landes values from the coast
inland and from valley to ridge in the Vosges, which is misleading. The owner may overrule with the
25 km of D-29: the change is one default. Beyond the cap the weather stays empty with no error.

**Cap for the SYNOP station (sky, rain over 24 h): 50 km** (the D-29 default). It could **not be
measured from the sample**: `synop.sample.json` keeps 10 rows chosen as the first stations within
150 km of any test point, not the nearest ones, and it holds no station list. From those 10 rows
only: Vosges has Colmar-Meyenheim at 43.0 km and Luxeuil at 49.1 km (both inside 50 km); the nearest
sampled station to Fontainebleau is Orléans at 82.1 km; no sampled station is near the Landes. The
real SYNOP density at the test points needs `GET /liste-stations-synop`, documented by the swagger
and **not captured**; plan 27-12 should read that list at run time like the hourly list, and a
follow-up capture would settle the 50 km. About 190 stations over France (reported) mean a typical
spacing of about 55 km (an estimate: 550 000 km2 over 190 stations), so sky and rain over 24 h will often stay manual: that is expected.

The AROME model fallback is **not used** in this phase (D-19).

## Sky and rain over 24 h (D-21)

Temperature and wind are mapped first and never block either decision.

- **Sky: prefilled from the nearest SYNOP station within its cap**, using `ww` (fog, rain, snow,
  thunderstorm groups, WMO table 4677) and, when `ww` shows no such phenomenon, the cut of `n`
  (percent). When `n` is `null` and `ww` shows nothing, the sky stays `null` and the observer taps
  a chip: `nbas` is not a substitute (it only counts the lowest layer), and nulls are never
  invented. In the sample `n` was present in only 2 of 10 rows at 06:00Z, so a share of the surveys
  will keep the sky manual even inside the cap.
- **Rain over 24 h: prefilled from the nearest SYNOP station within its cap**, field `rr24` (mm, a
  negative trace value clamped to 0). The alternative, summing 24 hourly `rr1` readings, is rejected
  (up to 24 calls per cold station and hour, and the hourly rain is only the nearest hourly
  station's). `rr24` was non-null in 10 of 10 rows at 06:00Z; whether it is also reported at the
  other 3 hourly steps was **not observed**.
- Wind: because the hourly `ff` is `null` in 4 of 4 readings while SYNOP `ff` is present in 10 of 10
  rows, a wind coming from the nearest SYNOP station when the hourly one is `null` is possible. D-29
  keeps the wind on the hourly station ("nulls stay null"); using SYNOP for wind is **not decided**
  and is left to the owner.
- Every value keeps the source "Météo-France" (D-29). A SYNOP report is produced every 3 hours; the
  server uses the report nearest to the requested time inside the same tolerance rule.

## Quota

- Rate-limit headers: **none were sent** by the provider (reported). The quota shown under "Mes API"
  for "Données d'observation" has **not been reported by the owner yet: to be confirmed by the
  owner**. Documented in the research (not verified): since January 2026 the observation APIs are
  limited to 100 requests per minute as an experiment, 50 before, and a call over the quota is
  answered `429`.
- Limits built by plan 27-06 (read in `api/src/surveys/weather.service.ts` and
  `api/src/common/rate-limit.config.ts`): station list cached 1 hour; a reading of a finished hour
  cached 24 hours (`WEATHER_LOOKBACK_MS`), the current hour and an empty answer 10 minutes; at most
  3 stations merged per answer; `MAX_CONCURRENT_WEATHER_CALLS = 4` calls in flight; `weather`
  throttle 30 requests per minute per client; any provider failure, a `429` included, becomes
  `503 weather_provider_unavailable`.
- Comparison, in one sentence: with a shared cache by station and hour, one cold lookup costs at
  most about 5 provider calls (stations 1 per hour, up to 3 hourly readings, plus with D-29 the
  SYNOP list and one SYNOP report) and a warm one costs none, which keeps ordinary beta traffic far
  under 50 or 100 per minute, but **the plan 27-06 limits do not strictly guarantee it**:
  `MAX_CONCURRENT_WEATHER_CALLS` caps calls in flight, not calls per minute, and the per-client
  throttle (30 per minute) is not a global limit, so many clients at many distinct places and hours
  could exceed it; the answer to a refusal is a clean `503`. Plan 27-12 should weigh a small global
  limiter once the owner has reported the real quota.

## Licence and attribution

- Licence: Etalab Open Licence 2.0. The mention **"Source : Météo-France"** is mandatory in the app
  and in the PDF next to every weather value (D-26), and nothing may suggest that Météo-France
  endorses the app.
- Portal terms of use (open question O6: any limit on storing the values in survey records and in
  PDFs shared with partners): **to be confirmed by the owner**, no note was reported yet. The
  attribution stays mandatory until then.
- The subscription validity (about 2 years, documented) is also unconfirmed: to be confirmed by the
  owner.

## Fixture files

- `liste-stations.excerpt.json`: the 15 nearest hourly stations to each of the three test points
  (id, name, position, altitude, distance in km), the CSV column names and the total count (2151).
- `station-horaire.recent.json`: one real hourly reading (2026-10-12T04:00:00Z) for the nearest
  station of each test point; the base of the provider mapping tests.
- `station-horaire.old.json`: the same call for 2026-10-11T00:00:00Z (30 hours earlier), HTTP 200,
  one reading of the exact hour: the retention evidence.
- `synop.sample.json`: 10 SYNOP rows of the 06:00Z report and the row count of the whole answer
  (6513 over the default period, about 190 stations, reported).
- `dpobs-v2.swagger.json`: the official OpenAPI description of DPObs v2 (parameters, endpoints, the
  OAuth2 scheme).
