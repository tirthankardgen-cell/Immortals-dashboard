# Immortals patient dashboard

Standalone Next.js website for the Immortals sender/gateway project. The patient
directory shows names and unique IDs; selecting a patient opens their profile,
vitals, environmental readings, measurement history, and speaker-labelled transcripts.
The interface uses the Pi's navy, mint, blue, and amber theme, with prominent
vitals, patient information at the top, and compact environmental cards.

On desktop, the right workspace fits the viewport. The directory adjusts its
page size to the available height. The left navigation provides New patient and,
within a patient record, Vitals, Patient information, Record history, and Transcripts.
Long histories and transcripts scroll inside their panel. Mobile layouts remain
readable and adapt to the smaller screen.

The [two-phase project document](docs/PROJECT_UPGRADE_PLAN.md) describes the
patient monitoring upgrade and the subsequent offline speech upgrade.

## Run locally

Use Node.js **26.x**. The verified Windows runtime is **26.13.1**.

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. On this laptop, a verified portable Node runtime is
available inside the ignored `.tools` folder:

```powershell
./scripts/with-node.ps1 npm run dev
```

`/?view=preview` opens a clearly labelled workspace with fictional patient data.
Preview data never writes to Firebase. The normal `/` route reads live cloud
records and shows explicit empty, connection, or access states.

## Verified stack

| Component | Version |
|---|---|
| Next.js | 16.4.6 |
| React / React DOM | 19.3.1 |
| Tailwind CSS / PostCSS plugin | 4.3.5 |
| Firebase web SDK | 13.2.0 |
| Node.js | 26.13.1 locally; 26.x on Vercel |
| TypeScript compiler | 7.0.2 |

Versions were checked directly against the npm registry and official Node/Vercel
sources on 11 November 2026; evidence is in `docs/version-audit.json`.
TypeScript 7 runs alongside the official `@typescript/typescript6` compatibility
API, which the current Next.js ESLint tooling requires. This follows the
[TypeScript migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0).

Sources: [Next.js](https://registry.npmjs.org/next/latest),
[React](https://registry.npmjs.org/react/latest),
[Tailwind](https://registry.npmjs.org/tailwindcss/latest),
[Firebase](https://registry.npmjs.org/firebase/latest),
[Node releases](https://nodejs.org/dist/index.json), and
[Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Firebase connection

The supplied `immortals-3` web configuration is built in and can be overridden by
the `NEXT_PUBLIC_FIREBASE_*` variables listed in `.env.example`. These are Firebase
web application identifiers, not Admin SDK credentials. Analytics is wired through
the supplied measurement ID and is disabled unless `NEXT_PUBLIC_ENABLE_ANALYTICS=true`.

The website reads these Firestore paths:

```text
patients/{patient_id}                         profile: name, age, sex, profile_details
patients/{patient_id}/monitoring/latest       latest patient-associated sensor snapshot
patients/{patient_id}/readings/{reading_id}   history ordered by captured_at
patients/{patient_id}/transcripts/{event_id}  speech ordered by started_at
```

Readings use `patient_id`, `monitoring_session_id`, `device_id`, `captured_at`,
`received_at`, `uploaded_at`, `sensors`, and `waveforms`. ISO UTC dates and Firestore
Timestamp values are accepted. Sensor objects retain `status`, `age_seconds`, and
`values`, using the existing sender names/fields:

```text
pulse: heart_rate_bpm, spo2_percent, quality_percent
ecg:   heart_rate_bpm, candidate_bpm, quality_percent
mlx:   object_c, ambient_c
dht:   temperature_c, humidity_percent
bmp:   temperature_c, pressure_hpa
```

Waveform objects have `time_offset_ms`, `values`, `unit`, and `clear`; sample times
are relative to capture, from -8000 to 0 ms. Missing samples remain gaps. The
live screen expires old values from capture/source age even if no new database
event arrives, showing No recent data. Submitted checkups with
`recording_mode: "submitted_snapshot"` show Recorded in the directory and patient
record, retaining their original capture time, values, and waveforms after the live
timeout. Historical readings retain their capture-time values. ECG candidate
rates remain separate and visibly unreliable. Body temperature uses `object_c`
without an invented calibration offset and is labelled infrared surface.

Transcript segments contain `start_ms`, `end_ms`, `speaker_id`, and `text`.
They are grouped by patient/session and never assigned to a named speaker from
the patient's name alone.

## Authentication and access rules

Patient profiles, measurements, history, and transcripts are temporarily readable
by everyone without signing in, as requested by the owner on 12 November 2026.
Google and email/password sign-in remain available but are optional for viewing.
The website creates no authentication accounts. The New patient form creates
validated patient profiles without sign-in. Delete patient is also available
without sign-in and requires confirmation; it removes the profile and its cloud
monitoring, reading, session, and transcript documents. Existing records cannot
be edited through browser clients.

`firestore.rules` grants public reads under `patients/{patient_id}`, including
its monitoring, reading, and transcript subcollections.
Profile creation must atomically advance the website's daily registration counter.
Measurement creation/edits, existing-profile edits, and access-list reads/writes
are denied. Gateway/Admin SDK
credentials stay outside this website and bypass client rules as intended.

Firestore rules deploy to **Firebase**, separately from the website and environment
variables on **Vercel**:

```sh
npx firebase-tools@15.35.0 deploy --only firestore:rules --project immortals-3
```

If several Firebase CLI accounts are saved, select the account that owns this
project using `--account`. Rule tests use only the local `demo-immortals` emulator:

```sh
npm run test:rules
```

Java 21 or later is required for the current Firestore emulator. These nine checks
cover public reads, anonymous registration, concurrent ID allocation, immutable
records, atomic profile/counter writes, complete patient deletion, and access-list isolation.

## Patient registration

The public header shows the Firebase connection status. Preview and Sign in
controls are removed from the dashboard. Patient search combines age groups,
gender, and measured/not-measured filters with name/ID search, sorting, and
list/grid views. Measurement filters check matching patients before pagination;
older saved captures still count as measured. Reset clears all search filters.

Compact record layouts keep controls, waveform captions, and measurement notes
separate. Recorded capture timestamps appear in the patient header.

`/patients/new` uses the sender v2 fields: name (1–80 characters), age (a whole
number from 0–130), and sex (Female, Male, Other, or Prefer not to say). It stores
`patient_id`, matching `patient_code`, a UUID, `created_at`, and `age_recorded_at`,
so the profile passes `Sender_v2/patient_common.py` validation and can be read by
the receiving gateway's patient-list synchronization.

The ID follows the sender's `IMM-YYYYMMDD-XXXXXXXX-NNNNN` nomenclature, using the
India registration date and a persistent daily sequence. The website's separate
eight-hex registrar code is `57454201`; the Pi uses its XBee address suffix.
This keeps website registrations separate from the sender's offline counters.
The website counter is stored at `registration_counters/{prefix}`. Registration
transactions keep the ID unique during simultaneous submissions. Preview mode
does not create patient records.

## Titles and sharing previews

Each page includes a title, description, canonical URL, Open Graph tags for
WhatsApp/Facebook/LinkedIn, and a Twitter large-image card. The shared branded
image is `public/social-preview.png` (1200×630), with PNG favicon, home-screen
icons, an Apple touch icon, a manifest, theme color, and WebSite structured data.
Patient names and measurements are not embedded in sharing images.

Regenerate the brand assets with the installed Next.js/Sharp dependencies:

```sh
node scripts/generate-brand-assets.mjs
```

## Vercel and GitHub

Repository: <https://github.com/tirthankardgen-cell/Immortals-dashboard>.
Production: <https://immortals-dashboard.vercel.app>.
Fictional preview: <https://immortals-dashboard.vercel.app/?view=preview>.
The repository root is the contents of this `Website` folder, so the Vercel Root
Directory is the repository root. The linked project is `immortals-dashboard`
under `tirthankar-s`. `vercel.json` selects Next.js; `package.json` selects Node 26.x.

Configure all variables from `.env.example` in production, preview, and development,
then deploy:

```sh
npx vercel@65.14.0 --prod
```

Firebase web configuration is set for all three Vercel environments. The
production website is public; Firebase rules control patient access. Vercel
preview deployments retain Vercel Authentication protection.

No additional Express server, Python runtime, or Pi connection is needed by this
website. Next.js runs its Node server/API on Vercel. `/api/health` exposes only
application status, Node version, and Firebase project ID.

## Validation

```sh
npm run check
```

This runs ESLint, strict TypeScript checking, meaningful Node tests for patient
association/freshness/signal distinctions/waveform gaps, and a production build.
Browser QA covers directory navigation, search, pagination, grid view, all patient
tabs, and responsive layouts. Local captures are in the ignored `output/playwright`
folder. Deployment credentials, `.env.local`, cached tools, logs, and backups are
excluded from Git.
