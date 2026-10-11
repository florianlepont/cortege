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

Users can choose the visibility of their survey as either private or public before submission, with the default set to private. Visibility can be changed later, and public surveys can be shared with the community, while private surveys are only visible to the contributor and authorized moderators/admins.

As a contributor, I want to choose whether my survey is private or public so I control what is shared with the community.

Acceptance criteria

- Before submission, I can set survey visibility to `private` or `public`.

- Default visibility is `private`.

- I can change visibility later from survey detail.

- `Public` surveys are shareable to community surfaces; `private` surveys remain visible only to the contributor and authorized moderators/admins.

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

The weather of the visit (sky, temperature, wind, rain over the last 24 hours, observation time) is filled in from Météo-France once the parcel is chosen, so the observer only corrects it. The app reaches the provider only through the Cortege API.

As a contributor, I want the weather of my survey pre-filled so I do not have to look it up or type it.

Acceptance criteria

- Once the parcel is chosen and the network is there, the weather is requested for the centre of the parcel and the survey time, and the values the provider supplies appear in the "Conditions" section.

- Every value can be edited by hand; a value the observer edited is never overwritten by a later lookup, and a "Remplir à nouveau" action replaces it only after a confirmation.

- A value the provider does not supply stays empty for manual entry; an empty weather is valid.

- Offline, or when the provider fails, the section stays empty with no error; when the network returns, the draft fills in for the survey time, not the reconnection time, as long as the survey is at most 24 hours old and the observer entered nothing there.

- Older than 24 hours, the section stays empty and editable by hand.

- Wherever the provider values are shown or printed (Conditions section, survey summary, PDF) the line "Source : Météo-France" is shown.

- The weather syncs with the survey, is read-only once the survey is submitted, and is visible to the members who can read the survey.

### US-C12 - Doubt Flag per Factor

**Release:** V1 (phase 27, `REQ-C-doubt-flag`)

When the observer is not sure of an observation, they can say so without changing the data they entered. The doubt is information for the readers of the survey; it is not a score input.

As a contributor, I want to flag a factor as "Douteux" so the readers of my survey know how much to trust it.

Acceptance criteria

- Each factor A to J has a "Douteux" switch in its strip, off ("Sûr") by default; only "Douteux" is set by the observer.

- The doubt is shown wherever the factor is shown: the score page, another member's view of the submitted survey, and the PDF.

- The doubt never changes a score, a band, a total or a validation result, proved by parity cases run in the shared package, the API adapter and the mobile adapter.

- The doubt syncs with the survey and is read-only once the survey is submitted.
