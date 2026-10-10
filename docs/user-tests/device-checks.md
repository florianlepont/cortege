# Device checks carried over from earlier phases

Checks that could not be done in the build sessions because they need a real phone or the production server. Each one comes from the `human_verification` entries of a `VERIFICATION.md` and is owned by the person who can run it. Fill the status column as you go; a check is closed only when the outcome is written down.

Legend: ✅ Pass · ❌ Fail · ⚠️ Pass with issue · 🔲 Not tested

Phase 28's success criterion 7 points here. The Android recognition check (D-01) is owned by Phase 29, which reworks the workflow first.

| # | From | Check | Expected | Where | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| D-01 | Phase 15 | Genus recognition on real Android phones, online and in airplane mode, on a set of real photos: record median, p95 and worst total latency | Camera shows a live preview (not black), a suggestion comes back within the 3 s budget at median and p95 in both network states, and the top-1 genus matches what iOS gives | Android phones, after Phase 29 | 🔲 | Failed in the field on every Android phone tested (black camera), 2026-10-10: Phase 29 |
| D-02 | Phase 15 | Real photos of trees, leaves and bark, airplane mode: order of the suggestions, honesty of the confidence words ("Fiable" mostly right, "Très faible" often wrong), nothing needs the network | Most likely genus first with alternatives under it; a wrong first guess is usually among the alternatives | iPhone and Android | 🔲 | |
| D-03 | Phase 15 | After a recognition, no photo lingers on the device (the camera capture and the resized JPEG) | No attachment, no database row, nothing synced; the temporary files are deleted explicitly | iPhone and Android, after Phase 29 | 🔲 | Today the two temporary files are left to the OS cache cleanup: Phase 29 deletes them |
| D-04 | Phase 17 | Airplane-mode walkthrough: download an area, switch to airplane mode, navigate a parcel, see your own surveys on the map | Map, parcel and own surveys work with no network | iPhone and Android | 🔲 | |
| D-05 | Phase 17 | Same walkthrough after a force quit and relaunch | Downloaded area and surveys still there | iPhone and Android | 🔲 | |
| D-06 | Phase 18 | Fresh Release install, watch the first second | Forest-green native splash with the logo, then the app; note whether the login screen flashes before the carousel | iPhone (Release build) | 🔲 | |
| D-07 | Phase 18 | Refuse location and camera on the permissions screen, tap "Ouvrir les réglages" | The app's Settings page opens; a later grant is reflected on return | iPhone and Android | 🔲 | |
| D-08 | Phase 18 | Look at the launcher icon under a circular mask | The logo mark is not clipped | Android | 🔲 | |
| D-09 | Phase 19, reworked in 25.1 | Open a submitted survey, share the PDF to Mail, Files or Drive; repeat in airplane mode after an app restart, on a survey opened once online | The share sheet opens with the PDF; offline it is still produced, with year and version filled in | iPhone and Android | 🔲 | Check the 25.1 export, and again after Phase 36 |
| D-10 | Phase 20 | Backup timer installed on the server and one real dump produced | `cortege-postgres-<timestamp>.dump` of several tens of KiB in `/home/ubuntu/backups/postgres/`; `systemctl list-timers cortege-backup.timer` shows the next 03:17 UTC run | Production server, owner only | 🔲 | Repeat on the new server in Phase 38 |
| D-11 | Phase 20 | One restore of a real dump into a throwaway database | "restore OK", 8 or more public tables, a surveys count equal to the live count | Production server, owner only | 🔲 | Repeat on the new server in Phase 38 |

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

The restore script prints the table and survey counts and the `dropdb` command to remove the throwaway database afterwards.

## Decisions recorded 2026-10-10

- Phase 17, deferred parcel-history download: kept as is (the result of the queued fetch is discarded; the history is read live online; Phase 24 already caches the history per parcel on the phone).
- Phase 17, download progress in the Explorer sheet: an indeterminate "Téléchargement…" button is not enough; showing the percentage there is part of Phase 31.
