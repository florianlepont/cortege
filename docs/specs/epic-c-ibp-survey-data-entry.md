# Epic C - IBP Survey Data Entry

**Release:** MVP

Create, edit, and submit IBP surveys with validation and expiration rules.
Provide on-demand pedagogical guidance during survey completion.

---

## User Stories

### US-C1 - Guided Data Entry

**Release:** MVP

A guided form will be created to ensure all required information is captured, including clearly identified mandatory fields, parcel linkage metadata, all IBP factors, appropriate field types, and validation errors displayed per field.

As a contributor, I want to complete a guided form so I do not miss any required information.

Acceptance criteria

- Required fields are clearly identified.

- The form captures mandatory parcel linkage metadata (`parcel_ids[]`, observation year, version).

- The form includes all IBP factors (`A` to `J`) and each factor can be completed from the survey form flow.

- Field types are appropriate (text, number, list, date, boolean).

- Validation errors are displayed per field.

### US-C2 - Save as Draft

**Release:** MVP

As a contributor, the ability to save a draft at any time without submission is essential. Draft changes should be saved automatically and be accessible offline, with a visible last modified date. A warning will appear if less than 24 hours remain before expiration.

As a contributor, I want to save a draft so I can continue later.

Acceptance criteria

- I can save at any time without submitting.

- Draft changes are saved automatically locally while editing.

- The draft is available offline on the device.

- The last modified date is visible.

- If less than 24 hours remain before expiration, a warning is displayed.

### US-C3 - Supporting Photos

**Release:** MVP

Users can attach up to 10 photos to a survey, either by taking new photos or selecting existing ones. They can preview and navigate between photos, remove any before submission with confirmation, and all photos remain linked to the survey after synchronization, allowing offline access if previously synced.

As a contributor, I want to capture and attach photos to the survey to document the situation.

Acceptance criteria

- I can add up to 10 photos per survey.

- I can preview photos before submission.

- I can remove a photo before submission.

- Photos remain linked to the survey after synchronization.

### US-C4 - Parcel Linkage By Map Selection

**Release:** MVP

Users can select cadastral parcels on the map for traceability, with criteria including the ability to tap parcel polygons, reference multiple parcels, center the map on the current location, and create drafts offline. Submission is blocked if parcel linkage is missing or invalid.

As a contributor, I want to select one or many cadastral parcels directly on the map to ensure traceability and longitudinal follow-up.

Acceptance criteria

- During create/edit, user can tap parcel polygons to select or deselect them.

- A survey can reference one or many parcels (`parcel_ids[]`).

- The app can center the map on current location to help nearby selection.

- Offline mode does not block draft creation/edit; parcel linkage can be completed once parcel layer is available online.

- Submission is blocked if parcel linkage is missing or invalid.

### US-C5 - Submit Survey

**Release:** MVP

Submission of a completed survey requires all IBP factors to be filled and scoreable, with specific metadata present. If blocked, the app shows reasons for the blockage. ~~Surveys older than 7 days are marked as expired.~~ (Removed, OA-41 2026-10-06: there is no submission deadline.) Successful submissions change the survey status to read-only and trigger automatic synchronization.

As a contributor, I want to submit a completed survey to share my observation.

Acceptance criteria

- Submission is blocked until all IBP factors (`A` to `J`) are completed and scoreable.

- Submission is blocked if cadastral parcel linkage metadata is missing (`parcel_ids[]`, observation year, version).

- When submission is blocked, the app displays an explicit reason and identifies missing items (missing factors and/or required fields).

- ~~Submission is blocked if the survey is older than 7 days; the survey transitions to status `expired`.~~ Removed (OA-41 2026-10-06): a survey is never refused for its age.

- After a successful submission request, survey status transitions to `submitted` and the survey becomes read-only for data entry.

- A local confirmation message is displayed after successful submission.

- Synchronization is automatic after submission (no manual trigger required): the submitted survey enters sync flow and eventually reaches synced/error state according to Epic D rules.

### US-C6 On-Demand Pedagogical Help During Entry

**Release:** MVP

Contextual educational help will be provided during survey entry for complex fields, allowing users to access plain-language explanations, observations, and scoring guidance without losing their progress. Closing the help will return users to their previous state in the form.

As a contributor, I want contextual educational help while filling specific fields so I can complete IBP correctly even as a non-expert.

Acceptance criteria

- During survey entry, each complex field can expose a help entry point (for example: "Help" or "How to assess this factor?").

- Help content is displayed on demand without losing current form progress.

- Help content includes at least: plain-language explanation, what to observe in the field, and scoring guidance for the field.

- Closing help returns the user to the same field/state in the form.

### US-C7 - Survey Privacy Choice (Private/Public)

**Release:** MVP

Users choose who can read their survey in the submission step, the sheet "Qui peut voir ce relevé ?" opened by "Terminer le relevé": "Partagé avec l'association" (every member of the association, with the author's name) or "Privé" (only the contributor). "Partagé avec l'association" is pre-selected. The choice is stored on the draft, offline included, and it cannot be changed once the survey is submitted. (Phase 29; it replaces the earlier rule "default private, changeable later".)

As a contributor, I want to choose whether my survey is shared with the association or private so I control what the other members can read.

Acceptance criteria

- In the submission step I can choose "Partagé avec l'association" or "Privé". The sheet explains each choice: "Les membres de l'association peuvent le consulter, avec votre nom." and "Vous seul le voyez : il reste invisible pour les autres membres.". The app never says "public".

- "Partagé avec l'association" is pre-selected for a new draft. In the data the two values are `public` (shared with the association) and `private`.

- Both "Terminer le relevé" entries (the survey summary and the last factor page) open the same sheet. The footnote says "Ce choix ne pourra plus être modifié une fois le relevé terminé."

- Offline, the sheet shows the offline notice and the button "Enregistrer le choix": the choice is kept on the draft and the survey is finished once back online.

- The choice cannot change after submit: the survey summary shows it as a read-only line ("Partagé avec l'association" or "Privé").

- A shared survey appears on community surfaces (map, parcel colours, community pages, search, parcel history); a private survey is invisible to every other member on all of them, and its id answers the same "not found" as an unknown one. The contributor always sees their own surveys.

- No moderator or administrator read path to private surveys exists in the app or the API; one is deferred to V3.

### US-C8 - Survey Versioning and Historical Context

**Release:** V1

Each new survey on a parcel should have a version number and observation year, with the app suggesting the next version. It must display previous scores and allow viewing historical trends within the survey flow.

As a contributor, I want each new survey on the same parcel to be versioned and compared to previous years.

Acceptance criteria

- A survey on a parcel has an explicit version number (`1`, `2`, `3`, ...) and observation year.

- The app proposes a default next version when creating a new survey on an already studied parcel.

- Before and during entry, the app can show previous scores for the same parcel (total and factors).

- In survey detail, historical trend can be viewed without leaving the survey flow.

### US-C9 - Capture photos and recognize tree species to help complete Factor A

**Release:** MVP

As a field surveyor, I want to take photos in the app and automatically detect / suggest tree species from the photos so that completing Factor A is faster and more accurate.

Acceptance criteria:

- From the Factor A section, I can add one or more photos.

- The app suggests one or more species with a confidence score.

- I can confirm, edit, or reject the suggested species.

- The selected species are saved with the survey and can be reviewed later.

- The feature works offline once the model is available on-device, or clearly indicates when connectivity is required.

### US-C10 - Free Note on the Survey and on Each Factor

**Release:** V1 (phase 27, `REQ-C-survey-note`, `REQ-C-factor-note`)

The observer can write down what the form does not capture: the conditions of the visit and field remarks for the whole survey, and a short remark on any single factor. The notes are optional and never block saving or submitting.

As a contributor, I want to add a free note to my survey and to each factor so the context of my observations is kept with them.

Acceptance criteria

- A survey note of at most 1000 characters can be written in the "Conditions" section of the survey context page, before the factors.

- Each factor A to J has a collapsed strip with an "Ajouter une note" link; a factor note is at most 300 characters and is written without leaving the factor page, so the entry budget of the form is kept.

- Both fields show a character counter, and the counter warns near the limit.

- A note syncs with the survey (upsert, `/sync`, `/sync/changes`) and returns on a reinstall or a second device.

- A note is read-only once the survey is submitted.

- The note is visible to the members who can read the survey: in the survey summary (folded, with a link to read the rest), in the parcel history and in the exported PDF; the factor note shows under its factor on the score page and in the PDF.

- The survey note of the observer's own surveys is searchable in the global search, on the phone and offline; the community search is unchanged.

### US-C11 - Pre-filled Weather

**Release:** V1 (phase 27, `REQ-C-weather-provider`, `REQ-C-weather-prefill`, `REQ-C-conditions-sync`)

The weather of the visit (sky, temperature, wind, rain over the last 24 hours, observation time) is filled in from Météo-France once the parcel is chosen, so the observer only chooses the sky. The measurements are Météo-France data and are not editable (the licence forbids altering them); the sky is the observer's own judgement. The app reaches the provider only through the Cortege API.

As a contributor, I want the measurements of my survey pre-filled so I do not have to look them up or type them, and I want to say what the sky looked like.

Acceptance criteria

- Once the parcel is chosen and the network is there, the weather is requested for the centre of the parcel and the survey time, and the values the provider supplies appear in the "Conditions" section.

- Only the sky can be set or cleared by the observer (eight choices, pressing the chosen one again clears it); temperature, wind, rain over 24 hours and the observation time are read-only values from Météo-France. A sky the observer set or cleared is never overwritten by a later lookup.

- A value the provider does not supply stays absent; an empty weather is valid.

- Offline, or when the provider fails, the section stays empty with no error; when the network returns, the draft fills in for the survey time, not the reconnection time, as long as the survey is at most 24 hours old and the observer entered nothing there.

- Older than 24 hours, the measurements stay absent and only the sky can be chosen.

- A draft that has parcels but never got a survey time (made before phase 27, pulled, seeded) is stamped when its parcels change; as a safety net the lookup also takes its creation time as the survey time while that is within 24 hours, and never invents a time otherwise (D-39).

- Wherever the provider values are shown or printed (Conditions section, survey summary, PDF) the line "Source : Météo-France" is shown; when the sky shown is the observer's it adds "conditions saisies par l'observateur", and a weather with only the observer's sky carries no Météo-France mention.

- The weather syncs with the survey, is read-only once the survey is submitted, and is visible to the members who can read the survey.

### US-C12 - Doubt Flag per Factor

**Release:** V1 (phase 27, `REQ-C-doubt-flag`)

When the observer is not sure of an observation, they can say so without changing the data they entered. The doubt is information for the readers of the survey; it is not a score input.

As a contributor, I want to flag a factor as "Incertitude" so the readers of my survey know how much to trust it.

Acceptance criteria

- Each factor A to J has an "Incertitude" toggle, off by default; only "Incertitude" is set by the observer. Since follow-up 32-27 it is a small pill at the top of the factor page, in one row with a "Note" pill, under the "Aide au relevé" link or the intro paragraph.

- The doubt is shown wherever the factor is shown: the score page, another member's view of the submitted survey, and the PDF.

- The doubt never changes a score, a band, a total or a validation result, proved by parity cases run in the shared package, the API adapter and the mobile adapter.

- The doubt syncs with the survey and is read-only once the survey is submitted.

### US-C13 - Aide au choix du parcours

**Release:** V1 (phase 30, `REQ-C-route-guide`, `REQ-DOC-route-rules`)

After the parcels are chosen, a mandatory step of the survey creation helps the observer choose how to walk the stand: the **parcours** (in full, or partial by strip or by plot) and the **mode de relevé** (capped or uncapped). It asks a few closed questions, only the ones whose answer can change the result, proposes a route with the reasons in plain French, and lets the observer change it or choose directly. It uses the words of the official method, each with a one-sentence explanation, and works offline. The rules are in [`route-choice-rules-v1.md`](route-choice-rules-v1.md) (validated 2026-10-14); the proposal depends on the stand only (surface, homogeneity, difficulty to observe, width), never on the observer's experience or time.

As a contributor who does not know the method, I want the app to propose how to walk my stand and tell me why, so I do not have to read the official methodology.

Acceptance criteria

- The step comes after the parcel map and before the survey exists; it cannot be skipped, and going back returns to the parcel map without writing anything.

- The surface is estimated from the chosen parcels and can be corrected; when it cannot be computed it is typed by hand, with no connection needed.

- Each question is closed, appears only if its answer can change the result, and is shown one at a time with a one-line reason; an answered question folds into one line and can be reopened.

- The proposal shows the parcours, the mode de relevé, the surface described and up to four reasons in plain French; the mode is capped by default and the uncapped mode is never suggested.

- Above 10 ha for a varied stand, or 20 ha for a homogeneous one, the app offers two options, "Découper en sous-peuplements" (pre-selected, marked "Conseillé") and "Parcours partiel".

- Experience and time available are in a folded optional section "Pour affiner": they give only a duration range and notes, and never change the route.

- "Je connais déjà mon parcours" opens the chooser directly: the parcours, the mode de relevé (five presets and one chip per factor for the uncapped mode) and the surface described, without answering any question.

- Each term of the method ("parcours en plein", "parcours partiel", "relevé plafonné", "relevé déplafonné", "peuplement") carries its explanation, and the word "méthode" is never used for the parcours ("Méthode IBP" stays the version).

- A tester who does not know the method completes the choice unaided, in a recorded test whose report is in [`../user-tests/route-choice-assistant.md`](../user-tests/route-choice-assistant.md) (`REQ-FT-route-test`).

### US-C14 - Parcours utilisé

**Release:** V1 (phase 30, `REQ-C-route-record`, `REQ-C-route-display`, `REQ-C-uncapped-entry`)

The route accepted in the step above is recorded with the survey, so that the way it was made is kept and two scores can be compared. It never changes a score.

As a contributor, I want the route of my survey kept and shown, so my readers know how the survey was made.

Acceptance criteria

- The route (`survey_route`: parcours, mode de relevé, factors counted in full, surface described, rest of the stand, how it was chosen) is saved with the survey, syncs (upsert, `/sync`, `/sync/changes`) and returns on a reinstall or a second device.

- It is shown as text in a "Parcours utilisé" card on the "Parcelles" page of the survey (moved from Contexte on 2026-10-14, at the owner's request), as a short label on the summary's parcels row, on another member's survey (read-only) and as a block of the PDF after "Conditions du relevé".

- A draft can change its route (link "Modifier le parcours") but never remove it; the route is read-only once the survey is submitted.

- A draft without a route (made before the phase) shows "Parcours à choisir" and cannot be finished or sent until a route is chosen; it stays on the phone meanwhile. The server refuses to create or submit a survey without a route when the request comes from the current app (`route_required`).

- A survey submitted before the phase shows "Parcours : non renseigné" with a short sentence, and its PDF is unchanged.

- When a factor is counted in full, B asks the cover of each stratum and F the number of trees per dendromicrohabitat group and its own surface; capped factors and all scores are unchanged, proved by the parity cases `MAT-B-UNC-*` and `MAT-F-UNC-*`.

