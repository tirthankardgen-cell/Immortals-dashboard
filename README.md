# Immortals patient dashboard

Standalone Next.js website for the Immortals sender/gateway project. The patient
directory shows names and unique IDs; selecting a patient opens their profile,
vitals, environmental readings, measurement history, and speaker-labelled transcripts.
The interface uses the Pi's navy, mint, blue, and amber theme, with prominent
vitals, patient information at the top, and compact environmental cards.

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
event arrives. Historical readings retain their capture-time values. ECG candidate
rates remain separate and visibly unreliable. Body temperature uses `object_c`
without an invented calibration offset and is labelled infrared surface.

Transcript segments contain `start_ms`, `end_ms`, `speaker_id`, and `text`.
They are grouped by patient/session and never assigned to a named speaker from
the patient's name alone.

## Authentication and access rules

Google and email/password sign-in use Firebase Authentication. Providers must
be enabled for the Firebase project and the deployment domain must be authorized.
The website creates no accounts and performs no patient-data writes.

`firestore.rules` grants patient reads to verified authenticated users with an
Admin-set `admin`/`immortals_viewer` claim or a server-managed
`dashboard_access/{verified_email}` document containing `enabled: true`.
All browser writes and access-list reads/writes are denied. Gateway/Admin SDK
credentials stay outside this website and bypass client rules as intended.

Firestore rules deploy to **Firebase**, separately from the website and environment
variables on **Vercel**:

```sh
npx firebase-tools@15.35.0 deploy --only firestore:rules --project immortals-3
```

## Vercel and GitHub

Repository: <https://github.com/tirthankardgen-cell/Immortals-dashboard>.
The repository root is the contents of this `Website` folder, so the Vercel Root
Directory is the repository root. The linked project is `immortals-dashboard`
under `tirthankar-s`. `vercel.json` selects Next.js; `package.json` selects Node 26.x.

Configure all variables from `.env.example` in production, preview, and development,
then deploy:

```sh
npx vercel@65.14.0 --prod
```

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
