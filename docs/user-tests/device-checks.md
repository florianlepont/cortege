# Device checks carried over from earlier phases

Checks that could not be done in the build sessions because they need a real phone or the production server. Each one comes from the `human_verification` entries of a `VERIFICATION.md` and is owned by the person who can run it. Fill the status column as you go; a check is closed only when the outcome is written down.

Legend: ✅ Pass · ❌ Fail · ⚠️ Pass with issue · 🔲 Not tested

Phase 28's success criterion 7 points here. The Android recognition check (D-01) is owned by Phase 29, which reworks the workflow first.

| # | From | Check | Expected | Where | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| D-01 | Phase 15 | Genus recognition on real Android phones, online and in airplane mode, on a set of real photos: record median, p95 and worst total latency | Camera shows a live preview (not black), a suggestion comes back within the 3 s budget at median and p95 in both network states, and the top-1 genus matches what iOS gives | Android phones, after Phase 29 | 🔲 | Failed in the field on every Android phone tested (black camera), 2026-10-10: Phase 29. 2026-10-10, emulator (Pixel 8, API 36): the black camera is NOT reproduced, in a development or a Release build (the preview shows the virtual room). What was found instead: in a Release build the model never loaded ("Le modèle d'identification n'a pas pu être chargé") because the library's Android loader only accepts a real URL while a Release build gives it a bare resource name; fixed in PR #272, then the Release returns five suggestions on the emulator. Latency not measured, real phones not tested. Old first suspect, now weakened: `GenusCameraView` (expo-camera 57.0.5) is rendered inside a full-screen React Native `Modal` (`GenusRecognitionModal`), a setup known to give a black preview on Android; the permission request is made before and is not the cause |
| D-02 | Phase 15 | Real photos of trees, leaves and bark, airplane mode: order of the suggestions, honesty of the confidence words ("Fiable" mostly right, "Très faible" often wrong), nothing needs the network | Most likely genus first with alternatives under it; a wrong first guess is usually among the alternatives | iPhone and Android | 🔲 | |
| D-03 | Phase 15 | After a recognition, no photo lingers on the device (the camera capture and the resized JPEG) | No attachment, no database row, nothing synced; the temporary files are deleted explicitly | iPhone and Android, after Phase 29 | 🔲 | Today the two temporary files are left to the OS cache cleanup: Phase 29 deletes them |
| D-04 | Phase 17 | Airplane-mode walkthrough: download an area, switch to airplane mode, navigate a parcel, see your own surveys on the map | Map, parcel and own surveys work with no network | iPhone and Android | ⚠️ | 2026-10-10, owner (iPhone, screen recording): in airplane mode the downloaded basemap, the parcels, the scored parcels and the position all display, zooming in and out included (✅). Finding F-1: tapping another member's survey opens "Relevé de la communauté" with a broken error state (the message is pushed under the status bar, an empty tall capsule fills the middle, "Réessayer" sits at the bottom); Phase 29. Android not tested yet |
| D-05 | Phase 17 | Same walkthrough after a force quit and relaunch | Downloaded area and surveys still there | iPhone and Android | ⚠️ | 2026-10-10, owner (iPhone, screen recording): after a force quit in airplane mode the basemap, the parcels and the scored parcels are still there and a red "Hors connexion" badge shows (✅). The community survey counted before the restart ("1 relevé ici") is gone afterwards ("Aucun relevé ici"): another member's surveys are not kept offline, which is expected. The same broken error page (F-1) opens when a parcel is tapped. Own surveys checked next: failed, see F-2 |
| D-06 | Phase 18 | Fresh Release install, watch the first second | Forest-green native splash with the logo, then the app; note whether the login screen flashes before the carousel | iPhone (Release build) | ⚠️ | 2026-10-10, owner: after a force quit the green native splash with the logo shows, then the app (✅). The login-screen flash before the carousel could not be checked: it needs a fresh install while signed out |
| D-07 | Phase 18 | Refuse location and camera on the permissions screen, tap "Ouvrir les réglages" | The app's Settings page opens; a later grant is reflected on return | iPhone and Android | ⚠️ Android | 2026-10-10, emulator (fresh install): refusing the camera shows "Appareil photo refusé" with "Ouvrir les réglages"; tapping it opens the Android App info page of Cortege (✅). iPhone remains (needs a fresh install) |
| D-08 | Phase 18 | Look at the launcher icon under a circular mask | The logo mark is not clipped | Android | ⚠️ static | 2026-10-10, checked on the asset (not on a phone): the black disk of `logo-app.png` spans about 68 % of the canvas, the visible circle of a circular launcher mask is about 67 %, so the edge can be clipped by under 1 % of the canvas on a pure circle mask and not at all on squircle masks. Acceptable. Seen 2026-10-10 on the emulator (App info page and welcome screen): the logo disk displays whole (✅ emulator); a real Android launcher remains optional |
| D-09 | Phase 19, reworked in 25.1 | Open a submitted survey, share the PDF to Mail, Files or Drive; repeat in airplane mode after an app restart, on a survey opened once online | The share sheet opens with the PDF; offline it is still produced, with year and version filled in | iPhone and Android | ✅ iPhone | 2026-10-10, owner: PDF of a submitted survey shared and opened online, then in airplane mode after an app restart, with site, parcels, year, version, date, ten factors and total filled in (25.1 export). Android and the check after Phase 36 remain |
| D-10 | Phase 20 | Backup timer installed on the server and one real dump produced | `cortege-postgres-<timestamp>.dump` of several tens of KiB in `/home/ubuntu/backups/postgres/`; `systemctl list-timers cortege-backup.timer` shows the next 03:17 UTC run | Production server, owner only | ✅ | 2026-10-10, owner: timer next run Sun 2026-10-11 03:24 UTC (last run 2026-10-10 03:20), a dump every night since 2026-09-27 (27 KiB then 372 KiB). Repeat on the new server in Phase 38 |
| D-11 | Phase 20 | One restore of a real dump into a throwaway database | "restore OK", 8 or more public tables, a surveys count equal to the live count | Production server, owner only | ✅ | 2026-10-10, owner: dump of 2026-10-10 03:20 restored, "restore OK", 8 tables, 1025 surveys; live count 1030 (5 created since the dump); throwaway database dropped. Repeat on the new server in Phase 38 |

## Commands for D-10 and D-11

Run on the server, as written in `infra/vps/README.md` (Backups):

```bash
sudo cp cortege-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cortege-backup.timer
sudo systemctl start cortege-backup.service
ls -lh /home/ubuntu/backups/postgres/
```

```bash
infra/vps/restore-postgres.sh /home/ubuntu/backups/postgres/<a real dump>
```

The restore script prints the table and survey counts and the `dropdb` command to remove the throwaway database afterwards. To compare with the live count, pass the secrets file: `docker compose -f /home/ubuntu/cortege/infra/docker-compose.vps.yml --env-file /home/ubuntu/cortege.env exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from surveys"'`.

## Decisions recorded 2026-10-10

- Phase 17, deferred parcel-history download: kept as is (the result of the queued fetch is discarded; the history is read live online; Phase 24 already caches the history per parcel on the phone).
- Phase 17, download progress in the Explorer sheet: an indeterminate "Téléchargement…" button is not enough; showing the percentage there is part of Phase 31.

## Findings

| ID | From | Finding | Phase |
|----|------|---------|-------|
| F-1 | D-04 | Offline, another member's survey opens a broken error page: the message is cut at the top, an empty capsule fills the middle, the retry button is at the bottom. Expected: a centred, readable message ("this survey needs a connection") with the retry button | 29 |
| F-2 | D-04, D-05 | Offline, after a restart, the Explorer shows none of the owner's surveys at country zoom: no cluster, no marker ("Aucun relevé ici", "Hors connexion"). Cause found in the code: the markers come from the API (`fetchPublicMapItems`); the only local source is `ownDraftMapItems` (`mobile/src/map/own-drafts.ts`), which draws drafts only, so a submitted own survey is missing offline. Screen recording of 2026-10-10 20:25 (Bois de Boulogne): with the network on, Explorer shows "46 relevés ici" wide then clusters of 2 and 3 and "3 relevés ici"; switching to airplane mode without closing the app keeps the same clusters (they live in memory), and they are lost only after a restart. Expected: the markers and clusters of the last view, and every own survey the phone holds (draft or submitted), are kept on the phone and drawn from local data when the network is down, also after a restart | 29 |
