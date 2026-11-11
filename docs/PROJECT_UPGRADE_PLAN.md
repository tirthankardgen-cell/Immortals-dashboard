# Immortals — Two-Phase Project Upgrade Plan

**Temporary access update — 12 November 2026:** Patient documents and their
subcollections are publicly readable without sign-in at the owner's request.
New patient registration is also available without sign-in, using the sender v2
ID format with website registrar `57454201` and an atomic daily counter. Existing
profiles cannot be edited by browser clients; sensor creation/edits and access-list
reads remain blocked. A confirmed Delete patient action removes the profile and
its cloud monitoring records, history, sessions, and transcripts. Authentication
is optional until private access is restored.

**Website layout and sharing update:** The desktop workspace fits one viewport,
with height-aware directory pagination and left navigation for registration and
patient sections. Page titles, descriptions, and a branded 1200×630 sharing image
support WhatsApp and other Open Graph/Twitter previews.

**Date:** 12 November 2026

**Status:** Website deployed to Vercel. Patient viewing, registration, and confirmed
deletion are temporarily public without sign-in. Sender/gateway v2 implementation
is documented below; complete hardware acceptance checks and Phase 2 speech
processing remain outstanding.

## Project objective

### Sender/gateway v2 update — 12 November 2026

The device is intended for health checkups in remote places. The sender works
without internet and has no Firebase access. It sends patient records over
Zigbee to a separate gateway; only the gateway connects to Firebase using its
internet link. Patient-list synchronization and upload acknowledgements return
to the sender over Zigbee. The website reads the resulting Firebase records.

The confirmed v2 flow replaces automatic live forwarding for this release:
**Choose/Add Patient → confirm → check vitals → Record Vitals → “Vitals recorded
successfully” popup → Send to Gateway**. The popup stays open for sending,
gateway acceptance and Firebase completion. Recording saves all sensor groups,
units/status/null values and available waveforms as a fixed local draft. Only
Send releases it to the radio. If the gateway is unavailable, show that the
record is saved on the device and will synchronize automatically, then close
the popup and return to the main screen. Checkups and acquisition continue
independently of radio/cloud failures. Touch screens use a virtual keyboard,
patient-name/ID search and rounded controls.

The exact same **IMM-YYYYMMDD-DEVICE8-COUNTER** `patient_id` is displayed on the
sender, carried in readings, used as the Firestore patient document key and
shown on the website; for example `IMM-20261112-408DF0F0-00001`. The date is India
time; DEVICE8 is the configured sender's radio suffix; the daily counter survives
restart. A separate `patient_uuid` remains available internally. This supersedes
the earlier proposal to use UUIDs as the primary/displayed patient ID. Duplicate
names remain distinct. Submission and monitoring-session IDs are separate UUIDs.

The laptop parent folder is unchanged. New releases are in `Sender_v2` and
`Receiver_v2`; deployed folders are `/home/pi/Desktop/Immortals_Monitor_v2` and
`/home/pi/Desktop/Immortals_Receiver_v2`. Original versions are preserved. See
[sender v2](Sender_v2/README.md), [gateway v2](Receiver_v2/README.md), and
[patient protocol](Sender_v2/ZIGBEE_PROTOCOL.md).

Persistent outboxes retain patient association and original capture times.
Gateway acceptance means durable local storage; Firebase completion is a
separate acknowledgement. Uploads run independently with bounded timeouts and
backoff. Retry IDs prevent duplicate histories and delayed records cannot
replace newer latest readings. Saved values remain labelled as recordings;
upload time does not make an old reading live. Phase 2 speech remains future work.

Upgrade Immortals into a patient-based vitals and speech monitoring platform.
The first Raspberry Pi is the sender and sensor device. The second Raspberry Pi
is the receiving gateway. Both phases use the path **sender Pi → Zigbee → receiver
Pi/gateway → Firebase → website/dashboard**.

**Phase 1** adds the sender UI flow for choosing an existing patient or creating
a new patient with name, age, and sex before scanning vitals. Patient-associated
readings are saved in Firebase. The website lists patients, and clicking a name
opens that patient's profile, details, vitals, and monitoring status.

**Phase 2** adds an external microphone to the sender Pi, offline transcription
using **whisper.cpp with the Whisper base model**, and local speaker differentiation
using **Sherpa-ONNX**. Speaker-labelled transcripts follow the same Zigbee and
Firebase path and appear as a selectable option on the patient's website page.

## Two-phase roadmap

| Phase | Target | Scope status | Completion condition |
|---|---|---|---|
| **Phase 1 — Patient UI, Firebase gateway, and website** | Select/create a patient on the sender, scan vitals, deliver patient-associated readings through Zigbee to Firebase, and display patient lists and details on the website. | Defined; all patient-selection and creation UI changes belong to Phase 1. | The patient-to-vitals-to-website flow passes the Phase 1 acceptance checks. |
| **Phase 2 — Offline speech and speaker differentiation** | Capture external-microphone audio on the sender, transcribe with whisper.cpp base, differentiate speakers with Sherpa-ONNX, and deliver labelled transcripts through Zigbee and Firebase to the website. | Defined; model packaging and performance need hardware validation. | The offline speech-to-patient-transcript flow passes the Phase 2 acceptance checks. |

The phases in this document define the full upgrade scope. The website portion
has been delivered; the existing sensor and live Zigbee releases remain the
starting point for the remaining sender and gateway work.

## Existing project baseline

The current source and release notes describe:

- **Sender Pi:** sensor acquisition, local touchscreen dashboard, and Zigbee
  transmission controlled by the existing ON/OFF button.
- **Receiver Pi:** Zigbee reception, packet validation, live readings, and a
  local browser dashboard.
- **Current measurements:** MAX30102 optical heart rate and estimated SpO2;
  ECG waveform and separately labelled ECG rates; MLX90614 surface and ambient
  temperature; DHT22 room temperature and humidity; BMP180 temperature and pressure.
- **Current transport:** a live Zigbee protocol with independent acquisition,
  radio, and display workers, plus explicit freshness and signal-quality handling.

See [Sender project](Sender/project.md), [Receiver project](Receiver/project.md),
[current release notes](Receiver/UPGRADE_NOTES.md), and
[current Zigbee protocol](Receiver/ZIGBEE_PROTOCOL.md) for the existing implementation.

## Phase 1 — Patient UI, Firebase gateway, and website

**Website delivery — 12 November 2026:** The standalone project is in `Website`
and is published at <https://immortals-dashboard.vercel.app> from
<https://github.com/tirthankardgen-cell/Immortals-dashboard>. It includes patient
lists, patient details, prominent vitals/waveforms, compact environmental cards,
history, and a reserved Transcripts view. Firebase Authentication and restricted
Firestore reads are configured; all browser writes are denied. The final build,
seven measurement-model tests, six rule tests, and authorized production reads
passed. The database currently has no patient profiles. Fictional records are
available only in the explicitly labelled `?view=preview` workspace. This does
not complete sender patient registration or the receiving gateway's uploads.

**Current UI increment — 11 November 2026:** The sender screen now has a patient
information header, a large vitals area with both waveforms, and compact
environmental cards along the right edge. It uses Demo Patient / DEMO-001
placeholders. The MLX90614 surface measurement appears under patient vitals as
body temperature, explicitly labelled infrared surface. This deployed layout
increment precedes the patient-selection/registration and Firebase work below.
See [sender UI release notes](Sender/UI_UPDATE_NOTES.md) for verification.

### 1. Target architecture

```mermaid
flowchart TD
    Start[Sender Pi: first screen] --> Choice{Choose patient or add patient}
    Choice -->|Existing patient| Existing[Select patient and verify patient ID]
    Choice -->|New patient| Form[Add patient: name, age, sex]
    Form --> Create[Create and persist unique patient ID]
    Existing --> Session[Confirm patient and start monitoring session]
    Create --> Session
    Session --> Vitals[Scan vitals on sender Pi]
    Vitals --> Local[Sender local dashboard]
    Vitals -->|Readings with patient and session IDs| Zigbee[Zigbee wireless link]
    Create -->|Patient registration event| Zigbee
    Session -->|Patient session event| Zigbee
    Zigbee --> Gateway[Second Pi: receiving gateway]
    Gateway --> Upload[Independent Firebase upload worker]
    Upload --> Database[Firebase database]
    Database --> List[Website: patient list]
    List -->|Click patient name| Detail[Patient details, vitals, and monitoring status]
```

The second Pi needs an internet connection to reach Firebase. Sensor data still
travels between the Pis over Zigbee. The website reads the cloud database, so a
remote viewer does not need a direct connection to the receiver's local network.

**Selected services:** Cloud Firestore for patient profiles and readings,
Firebase Authentication for website access, and Vercel for the Next.js website.
The Firebase web configuration is set in Vercel's production, preview, and
development environments. Gateway Admin SDK credentials stay on the second Pi.

### 2. Sender patient UI flow

The first screen on the sender must offer **Choose Patient** and **Add Patient**.
A patient monitoring session and its vitals recording/transmission start only
after a valid patient has been selected or created and confirmed. Phase 2 audio
capture follows the same gate. Patient-list and other control exchanges can run
before selection.

**Existing patient flow:**

1. Open **Choose Patient** and select a registered patient, using the specific
   patient ID to distinguish records with similar or identical names.
2. Display the patient's ID, name, age, and sex for confirmation.
3. Continue to the vitals dashboard and begin a monitoring session for that ID.

**New patient flow:**

1. Open **Add Patient** when the patient is not already registered.
2. Enter the required fields: **name, age, and sex**. Validate the form before saving.
3. Create a stable, unique patient ID and persist the patient record on the sender.
4. Display the created patient and ID, then continue to the vitals dashboard.
5. Send the patient registration, session context, and vitals over Zigbee to the
   gateway. The gateway saves them under that patient ID in Firebase.

The monitoring screen must always show the active patient's name and ID. A
**Change Patient / End Session** action ends the current association and returns
to the patient selector. Background sensor workers can continue operating, but
unassigned samples must not be saved as another patient's measurements.

The sender keeps a persistent local patient cache. Synchronize the available
patient list and registration results through a bidirectional Zigbee control
exchange with the gateway, which accesses Firebase. This avoids requiring a
direct Firebase connection on the sender. An uncached patient ID must be resolved
or the patient explicitly registered before starting that patient's session.
During a gateway/cloud outage, known cached patients and locally created patients
can be used with a clearly displayed pending-sync state.

### 3. Receiving gateway responsibilities

The receiver will extend its existing application to:

1. Receive and reconstruct Zigbee packets, extending the current validated
   protocol for patient registration, patient-list requests, and session events.
2. Validate the explicit patient and monitoring-session context carried by the
   sender, and reconcile patient registrations before publishing their readings.
3. Preserve measurement values, units, capture times, source identity, null values,
   signal-quality labels, and available pulse/ECG waveform data.
4. Save the patient-associated readings to Firebase through a separate worker.
5. Track cloud connection, pending uploads, failures, and the last successful upload.

Cloud operations must remain independent of Zigbee reception and the local
dashboard. Use bounded timeouts, retries with backoff, and a bounded persistent
upload buffer for temporary internet outages. Define the buffer limit and expose
unsaved-data counts if that limit is reached.

Use versioned message types and application acknowledgements for registration
and control exchanges; radio delivery alone does not confirm that a patient record
has been accepted. Hold dependent readings if their registration/context has not
yet been validated, and retry registration idempotently.

Buffered records retain their original patient association, monitoring session,
and capture time. Uploading an old reading after reconnection must not replace a
newer latest reading or make old data appear live.

### 4. Unique patient IDs and monitoring sessions

- Every patient receives a stable, globally unique `patient_id`. Use a UUID-based
  ID that can be generated offline; a shorter display code can be added separately.
- Patient names are display fields; the database uses the ID as the record key.
  Two patients with the same name must remain separate.
- The sender's Phase 1 UI creates/selects the patient and binds the active sender
  device to a separate `monitoring_session_id` before scanning begins.
- Every reading carries `patient_id`, `monitoring_session_id`, device ID, and
  capture time. The Zigbee radio address and transport session identify hardware
  and delivery; neither replaces the patient ID or monitoring-session ID.
- When a patient changes, end the previous monitoring session and begin a new one.
  Stamp the context at capture time and keep it immutable for queued readings.
  Late packets must not be assigned using only the device's current patient.
- Ambiguous or unassigned data must be held separately until its association is
  resolved; a patient name alone is never sufficient for assignment.

The current receiver accepts one configured sender. Phase 1 can list multiple
registered patients and show their stored details, while live monitoring follows
the active device assignment. Simultaneous reception from multiple sender Pis
requires additional requirements and implementation.

### 5. Proposed Firebase data structure

```text
patients/{patient_id}
    patient_id
    name
    age
    age_recorded_at
    sex
    profile_details
    created_at
    updated_at

patients/{patient_id}/monitoring/latest
    patient_id
    monitoring_session_id
    device_id
    session_id
    sequence
    captured_at
    received_at
    uploaded_at
    sensors
    waveforms

patients/{patient_id}/readings/{reading_id}
    timestamped patient-associated measurement record

patients/{patient_id}/sessions/{monitoring_session_id}
    device_id
    patient_id
    started_at
    ended_at

patients/{patient_id}/transcripts/{transcript_id}    # Phase 2
    patient_id
    monitoring_session_id
    device_id
    started_at
    ended_at
    received_at
    uploaded_at
    language
    segments
    transcription_model
    diarization_model
```

The required Phase 1 registration fields are **name, age, and sex**, alongside
the generated patient ID. Contact information, ward/bed, admission details, and
assigned clinician are optional future profile fields. Record when age was entered
so a saved age is not presented as a newly calculated value years later.

`sensors` preserves each sensor's values, units, status, source age, and quality
information. `waveforms` preserves available pulse and ECG samples with their time
information and clear/gap markers. Missing measurements stay null.

Use a repeatable reading key based on device, monitoring session, transport
session, sequence, and capture time so upload retries do not create duplicate
records. Keep the latest reading separate from history so the website can load
a patient quickly. Define cloud
update frequency, historical sampling, waveform storage, and retention before
implementation; cloud writes should not run synchronously for every RF fragment.

### 6. Website pages and behavior

| Page or workflow | Required behavior |
|---|---|
| Sign-in | Optional during temporary public access; retain authentication for future private access. |
| Patient registration visibility | Display patients created on the sender once the gateway synchronizes their profiles into Firebase. |
| Patient list | Show all registered patients without sign-in, including patient name, unique ID, monitoring status, and last measurement time. |
| New patient | Save a validated name/age/sex profile with the sender v2 ID format and an atomic website registration counter. |
| Delete patient | Confirm the selected patient's name/ID, then delete its profile and cloud monitoring, reading, session, and transcript documents. |
| Patient detail | Open when a patient name is clicked; show that patient's name, ID, entered profile details, vitals, and available waveforms. |
| Live updates | Refresh the selected patient's readings as new data reaches Firebase. |
| Unavailable or stale data | Clearly show missing, outdated, or offline readings and the time of the last measurement. |
| Transcripts option | Reserve a visible patient-page option/tab for Phase 2 speech transcripts; show an empty state until transcript data is available. |

The patient detail page will include optical heart rate, estimated SpO2,
temperature readings with their sensor/source labels, room humidity, pressure,
and available pulse/ECG graphs. Qualified ECG heart rate and provisional ECG
candidate rate must remain separate; unreliable estimates retain their label.

Freshness must be recalculated as time passes, even when Firebase sends no new
update. A stopped sender or disconnected gateway must cause the website to mark
the last reading stale. Upload time is not measurement time, and an internet
connection must not hide the age of the original sensor data.

### 7. Access and configuration

Keep Firebase gateway credentials on the receiver Pi, outside website assets and
source-control files. Current rules allow public patient reads, validated website
registration, and patient deletion. Authentication is optional for now; restore
authorized patient access when private mode is requested. The gateway writes validated sender
registrations, session records, and measurements. Any additional website profile
editing must follow the same patient-ID and session rules.

### 8. Implementation sequence

1. Select the Firebase project, database, access roles, upload frequency, and
   retention policies.
2. Build the sender's Choose Patient / Add Patient first screen, name-age-sex form,
   unique-ID creation, patient cache, and monitoring-session flow.
3. Extend sender and receiver together for patient-context messages, registration,
   list synchronization, and application acknowledgements while preserving vitals.
4. Add the independent Firebase upload worker to the receiver.
5. Build the website patient list, detail page, and reserved transcripts option.
6. Verify patient-specific storage, duplicate prevention, buffering, patient
   changes, and recovery with real Zigbee data.
7. Deploy the verified Phase 1 UI and gateway/website update to their respective
   devices and hosting environment.

### 9. Phase 1 acceptance criteria

- [ ] The sender starts with Choose Patient / Add Patient before patient scanning.
- [ ] Selecting an existing patient by its specific ID opens monitoring for that
      patient after confirmation.
- [ ] Add Patient requires name, age, and sex; successful creation persists a
      unique ID and allows that patient's vitals session to start.
- [ ] The monitoring screen shows the active patient; ending/changing patient
      creates a new session without misassigning pending or late readings.
- [ ] Sender patient-list/cache synchronization, pending registrations, and
      control acknowledgements work through the gateway.
- [ ] The second Pi receives real sensor data over the existing Zigbee link.
- [ ] Each registered patient has a unique ID and a separately stored profile.
- [ ] Measurements are saved under the patient assigned to the source device.
- [ ] Patients with identical names remain distinct; reassignment does not move
      old records or pending uploads to another patient.
- [ ] The website lists patients and clicking a name opens the correct profile.
- [ ] The patient page includes the reserved transcripts option for Phase 2.
- [ ] The detail page shows entered patient details, vitals, units, timestamps,
      signal-quality labels, and available pulse/ECG graphs.
- [ ] New readings update the website; missing and stale readings are displayed
      correctly, including when the sender is OFF or the gateway loses internet.
- [ ] Internet loss does not block reception, sender acquisition, or local display;
      buffered uploads recover within the defined storage policy.
- [ ] Upload retries do not duplicate records or overwrite newer latest data.
- [ ] Receiver restart restores the cloud worker and pending uploads without
      presenting saved old readings as live.
- [ ] Temporary public reads, validated registration, and deletion work without
      sign-in; browser measurement/profile edits and access-list operations are denied.

**Phase 1 deliverable:** A sender UI that selects or creates a patient before
scanning vitals, plus delivery through Zigbee to the receiver gateway and Firebase,
and a website with patient lists, individual profiles, and patient-specific vitals.

## Phase 2 — Offline speech and speaker differentiation

### 1. Target and selected software

Connect an external microphone to the **sender Pi**, capture speech during an
active patient monitoring session, transcribe it locally, and differentiate the
speakers. Deliver the resulting speaker-labelled text to the receiver gateway over
Zigbee, save it in Firebase under the same patient ID and monitoring-session ID,
and make it available through the website's **Transcripts** option.

| Component | Planned choice | Responsibility |
|---|---|---|
| External microphone | Pi-compatible external microphone; exact device to be selected/tested. | Capture speech on the sender Pi. |
| Offline transcription runtime | **whisper.cpp** on sender ARM64 Linux. | Run transcription locally without a cloud speech API. |
| Transcription model | **Whisper base** model in whisper.cpp-compatible format. | Convert captured speech to text. |
| Local speech/speaker toolkit | **Sherpa-ONNX** with compatible VAD and speaker models. | Detect voice activity, produce speaker embeddings, and support offline diarization. |
| Speaker association | Diarization/clustering and timestamp alignment on the sender. | Attach speaker labels to transcript segments. |
| Delivery | Existing Zigbee link, extended for transcript events. | Carry patient-associated transcript text and metadata to the gateway. |
| Storage and viewing | Firebase and the patient's website Transcripts option. | Save and fetch speaker-labelled transcript records. |

Sherpa-ONNX is the selected candidate for local VAD, speaker embeddings, and
diarization on ARM64/Raspberry Pi. Select and verify the actual models, runtime
build, dependencies, and performance on the deployed sender before release.
The requested transcription choice is whisper.cpp **base**; model quantization,
language settings, and worker sizing are implementation choices to benchmark.

### 2. Offline audio and transcript flow

```mermaid
flowchart TD
    Patient[Active patient and monitoring session on sender] --> Mic[External microphone capture]
    Mic --> Buffer[Timestamped local audio buffer]
    Buffer --> VAD[Sherpa-ONNX voice activity detection]
    VAD --> Speech[Detected speech segments]
    Speech --> Whisper[whisper.cpp: Whisper base transcription]
    Speech --> Speakers[Sherpa-ONNX speaker embeddings and diarization]
    Whisper --> Align[Align transcript text, times, and speaker labels]
    Speakers --> Align
    Align --> Events[Transcript events with patient and session IDs]
    Events --> Zigbee[Zigbee transfer alongside vitals]
    Zigbee --> Gateway[Receiver Pi: validate and reconstruct]
    Gateway --> Upload[Independent Firebase upload worker]
    Upload --> Firebase[Patient transcript records in Firebase]
    Firebase --> Web[Website: patient Transcripts option]
```

Capture and process all detected speech in the active session, rather than only
commands or a selected speaker. Normalize microphone input to the format required
by the selected models, typically mono 16 kHz PCM. Keep sample timing so transcript
and speaker segments can be aligned and attributed to the original session.

VAD, transcription, and speaker processing run locally; Firebase connectivity
is needed for eventual cloud upload, not for recognition. Use separate bounded
workers/processes and queues so model inference does not block sensor acquisition,
the sender UI, or Zigbee delivery. Benchmark sustained capture, CPU, RAM, storage,
and thermal behavior with sensors active; do not assume real-time inference on
the Pi. Make processing backlog, microphone failures, and any dropped audio visible.

At End Session / Change Patient, finalize or explicitly mark unfinished speech
segments. Audio captured under the previous patient retains that context even if
inference finishes after another patient's session begins.

### 3. Speaker differentiation and identification

- Diarization answers **which speaker spoke when**, using labels such as
  `Speaker 1` and `Speaker 2` within the monitoring session.
- Sherpa-ONNX speaker embeddings support comparison/clustering of voices. Align
  the resulting speaker intervals with whisper.cpp transcript timestamps.
- A patient's record owns the monitoring session; this does not mean every voice
  in that session belongs to the patient. Other people may also speak.
- Identifying a speaker by a real name or role requires enrolled voice samples
  and a verified matching policy, or a confirmed manual label mapping. Until then,
  show session-scoped anonymous labels and mark uncertain/overlapping speech as
  unknown or ambiguous instead of assigning a name without evidence.
- Verify differentiation with at least two speakers, pauses, noise, and overlapping
  speech. Cross-session recognition must not be assumed from session labels alone.

### 4. Zigbee delivery and Firebase transcript records

Extend the wire contract with a versioned transcript message type, coordinated
across sender and receiver. The current compact sensor-only envelope cannot be
treated as though it already carries patient metadata or transcript text.

Each finalized transcript event must include:

- `patient_id`, `monitoring_session_id`, and `device_id` stamped at audio capture.
- A stable `transcript_id`/event ID for deduplication and retry.
- Original segment start/end timestamps and language information when available.
- Text segments with speaker labels and any available uncertainty/quality markers.
- Transcription and speaker-model identifiers for traceability.

The `segments` field in `patients/{patient_id}/transcripts/{transcript_id}` stores
items such as `{start_ms, end_ms, speaker_id, text}` relative to the event start.
The gateway adds receipt/upload timestamps while preserving original audio times.
The website orders records by audio capture time, not by delayed upload time.

Transmit text and speaker/timestamp metadata over Zigbee. Raw microphone audio
is not part of the planned Zigbee payload. Chunk long transcripts into bounded
messages with validation/reassembly limits; use application acknowledgements,
retry, and persistent pending-event storage so temporary link failures do not
silently lose finalized transcripts. Report failures and storage-limit losses.

Share the radio through one scheduler/owner. Give current vitals priority while
allocating bounded capacity for transcript and control traffic so neither is
starved. Preserve the current verified packet-size constraints until new hardware
tests justify a change. Measure vitals latency while transcript traffic is active.
Respect the existing Zigbee ON/OFF control: OFF stops forwarding without stopping
local sensor operation or speech processing, and finalized transcript events stay
pending for later transmission within the defined storage limit.

The gateway accepts only complete validated events, saves them to the correct
patient/session, and deduplicates retries. Cloud upload remains a separate worker
with persistent buffering and recovery, as in Phase 1.

### 5. Website Transcripts option

On a selected patient's detail page, the **Transcripts** option will fetch that
patient's Firebase transcript records and show:

- Monitoring session and original capture date/time.
- Speaker-labelled text in chronological order.
- Named speakers only where a confirmed mapping exists; otherwise anonymous labels.
- Available processing/uncertainty status, plus an empty state when no speech has
  been saved and a clear pending/error state when reported by the pipeline.

Users can return to the patient's vitals without changing the selected patient.
Apply the same patient-access rules to transcripts as to profiles
and sensor readings.

### 6. Implementation and deployment sequence

1. Start from the verified Phase 1 sender/gateway/data contract. Use the independent
   `Sender/versions/03_next_upgrade` workspace for sender upgrade development and
   refresh its baseline to Phase 1 before adding speech features. The patient UI
   changes themselves are delivered in Phase 1.
2. Connect and verify the external microphone on the sender Pi.
3. Build/install whisper.cpp and download/install the Whisper base model locally;
   verify transcription with internet access disabled.
4. Install the selected Sherpa-ONNX ARM64 runtime and compatible VAD/speaker models;
   verify speaker differentiation and timestamp alignment offline.
5. Integrate patient-session audio capture, independent workers, bounded buffers,
   and finalized transcript events.
6. Extend sender/receiver Zigbee handling together, then add Firebase transcript
   storage and the website Transcripts view.
7. Run the Phase 2 acceptance checks with real speech and active sensors. Record
   model versions, latency, resource use, gaps, and recovery evidence.
8. Push/deploy the verified Phase 2 sender, gateway, and website changes to their
   respective targets, retaining backups and the verified Phase 1 release.

### 7. Phase 2 acceptance criteria

- [ ] The sender Pi captures usable audio from the external microphone.
- [ ] whisper.cpp runs the installed **Whisper base** model locally and transcribes
      speech while internet access is disabled.
- [ ] Sherpa-ONNX runs the selected VAD/speaker models locally on sender ARM64 and
      differentiates at least two speakers with aligned transcript labels.
- [ ] Silence, noise, overlap, and uncertain identity are handled without invented
      speech or unsupported named-speaker claims; observed limitations are recorded.
- [ ] Captured audio and resulting text retain the correct patient/session across
      patient changes, delayed inference, link outages, and queued uploads.
- [ ] Real speaker-labelled transcripts traverse Zigbee to the receiver gateway,
      are stored under the correct patient in Firebase, and appear on the website.
- [ ] Selecting the patient's Transcripts option fetches chronological text with
      speaker labels and capture timestamps; empty/pending/error states work.
- [ ] Long transcript chunking, complete-event validation, deduplication,
      acknowledgements, retry, restart, and cloud recovery are verified.
- [ ] Sensor acquisition, UI responsiveness, freshness, and vitals delivery remain
      functional during sustained speech inference and transcript radio traffic;
      measured latency and resource limits are documented.
- [ ] Microphone disconnect, model errors, backlog, and storage limits are reported
      without blocking the vitals system or silently reassigning data.
- [ ] Transcript access follows the same public/private mode as patient vitals,
      with browser transcript creation and edits denied.
- [ ] The verified Phase 2 update is deployed to the intended sender, receiver,
      and website, with backups and model/configuration versions recorded.

**Phase 2 deliverable:** External-microphone speech captured and transcribed on
the sender Pi using offline whisper.cpp base, differentiated with Sherpa-ONNX,
delivered as patient/session-linked text over Zigbee to the gateway and Firebase,
and accessible from the patient's website Transcripts option alongside vitals.

## Current Firebase and website deployment reference — 12 November 2026

### Projects and credential references

| Setting | Current value |
|---|---|
| Firebase project | `immortals-3` |
| Firestore database | `projects/immortals-3/databases/(default)` |
| Database type and region | Firestore Native, `asia-south1` |
| Firebase CLI deployment account | `tirthankar.dgen@gmail.com` |
| Gateway service account | `immortals-gateway`, role `roles/datastore.user` |
| Gateway runtime configuration | `/home/pi/.config/immortals/firebase.json` |
| Gateway Admin SDK credential | The private JSON file named by `credential_path` in that configuration; alternatively `GOOGLE_APPLICATION_CREDENTIALS` or Application Default Credentials |
| Gateway credential permissions | Directory `0700`, credential files `0600`, outside the sender/receiver source folders |
| Website environment | Laptop `Website/.env.local`; matching `NEXT_PUBLIC_*` variables configured in Vercel |
| GitHub repository and branch | https://github.com/tirthankardgen-cell/Immortals-dashboard, `main` |
| Vercel project and scope | `immortals-dashboard`, `tirthankar-s` |
| Production website | https://immortals-dashboard.vercel.app |
| Current patient access | Public viewing, validated creation, and confirmed cloud deletion; sign-in optional |

Firebase console: https://console.firebase.google.com/project/immortals-3/overview.
Service-account management:
https://console.firebase.google.com/project/immortals-3/settings/serviceaccounts/adminsdk.

The following is the **public Firebase web application configuration** used by
the dashboard. Its API key identifies the browser app; access is controlled by
Firestore rules. Gateway private-key JSON and CLI OAuth tokens stay in their
credential stores; this reference records the accounts and locations.

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAprY7F6j48OH2q1jdwgKlr-WwHioKt9jw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=immortals-3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=immortals-3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=immortals-3.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=515749825593
NEXT_PUBLIC_FIREBASE_APP_ID=1:515749825593:web:1b55995c75735beca511e8
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-WJH0J7G1ZB
# Optional: enable browser analytics only after your deployment setup.
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

The receiver reads `project_id`, `credential_path`, and
`request_timeout_seconds` from its private configuration. The current code's
defaults are a 10-second request timeout, 500 pending records, and a 32 MiB
outbox limit. The sender does not receive Firebase credentials. Receiver
Admin SDK writes use the gateway service account and bypass browser rules.

### Implemented Firestore collections

| Document path | Contents and behavior |
|---|---|
| `patients/{patient_id}` | Name, age, sex, `patient_id`, identical `patient_code`, `patient_uuid`, `created_at`, and `age_recorded_at`. Gateway-created profiles may additionally contain `updated_at` and `device_id`. |
| `patients/{patient_id}/monitoring/latest` | Latest submitted snapshot, including patient/session/device identity, original capture time, receive/upload times, sensors, quality/status, and waveforms. |
| `patients/{patient_id}/readings/{submission_uuid}` | Saved snapshot history. The receiver uses the submission/request UUID as the document key for repeatable retries. |
| `patients/{patient_id}/sessions/{monitoring_session_uuid}` | `patient_id`, `monitoring_session_id`, `device_id`, `started_at`, and `recording_mode: submitted_snapshot`. |
| `patients/{patient_id}/transcripts/{transcript_id}` | Reserved Phase 2 patient/session-linked speech records and speaker-labelled segments; the website already supports display. |
| `registration_counters/{IMM-YYYYMMDD-57454201}` | Website daily counter: `value` (integer) and `patient_id` (most recently assigned ID). |
| `dashboard_access/{email}` | Optional private-access entries retained for future use; browser reads/writes are currently denied and public viewing does not consult them. |

Website registrations use `IMM-YYYYMMDD-57454201-NNNNN`, with the India date,
a sequence padded to at least five digits, and a UUID stored separately.
The sender uses its eight-hex radio registrar (for example `408DF0F0`) in the
same format. A Firestore transaction creates the website profile and advances
its counter together. Existing browser profiles cannot be edited. The counter
survives patient deletion, so a deleted patient ID is not allocated again.

Deleting a patient clears its cloud `monitoring`, `readings`, `sessions`,
and `transcripts` documents in batches, then removes the profile. It does not
change other patients or remove the sender/gateway's local cache/outbox; a
later gateway upload can recreate a patient that is still stored on a Pi.

### Deployed Firestore rules

The source is `Website/firestore.rules` in the parent workspace and
`firestore.rules` at the website repository root. The deployed release is
`projects/immortals-3/releases/cloud.firestore`; its verified ruleset is
`projects/immortals-3/rulesets/4b8fd81e-ea6b-4cf6-b51c-7395eee944af`.

Rules source SHA-256: `85fb735d39e78219d92560f627278f8c2983a50c1ad269349241f8b310386a60`.

Public reads and deletes apply only to the patient tree. Browser profile
creation must meet the exact sender-compatible fields and atomic counter
checks. Browser measurement creation/updates, profile updates, access-list
operations, and unrelated collections remain denied.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function webPrefix(prefix) {
      return prefix.matches('IMM-[0-9]{8}-57454201');
    }
    function validProfile(data, patientId) {
      return patientId.matches('IMM-[0-9]{8}-57454201-([0-9]{5}|[1-9][0-9]{5,8})')
        && data.keys().hasAll(['patient_id', 'patient_code', 'patient_uuid', 'name', 'age', 'sex', 'created_at', 'age_recorded_at'])
        && data.keys().hasOnly(['patient_id', 'patient_code', 'patient_uuid', 'name', 'age', 'sex', 'created_at', 'age_recorded_at'])
        && data.patient_id == patientId && data.patient_code == patientId
        && data.patient_uuid is string
        && data.patient_uuid.matches('[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}')
        && data.name is string && data.name.size() >= 1 && data.name.size() <= 80
        && data.name.matches('[^\\x00-\\x1F]{1,80}') && data.name.matches('.*[^ ].*')
        && data.age is int && data.age >= 0 && data.age <= 130
        && data.sex in ['Female', 'Male', 'Other', 'Prefer not to say']
        && data.created_at is string
        && data.created_at.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z')
        && data.age_recorded_at == data.created_at;
    }
    function registrationCounterMatches(patientId) {
      let parts = patientId.split('-');
      let prefix = parts[0] + '-' + parts[1] + '-' + parts[2];
      let counter = /databases/$(database)/documents/registration_counters/$(prefix);
      return getAfter(counter).data.patient_id == patientId
        && getAfter(counter).data.value == int(parts[3])
        && ((!exists(counter) && getAfter(counter).data.value == 1)
          || (exists(counter) && getAfter(counter).data.value == get(counter).data.value + 1));
    }
    function validCounter(data, prefix) {
      let patient = /databases/$(database)/documents/patients/$(data.patient_id);
      return webPrefix(prefix)
        && data.keys().hasAll(['value', 'patient_id']) && data.keys().hasOnly(['value', 'patient_id'])
        && data.value is int && data.value >= 1 && data.value <= 999999999
        && data.patient_id is string && data.patient_id.matches(prefix + '-([0-9]{5}|[1-9][0-9]{5,8})')
        && int(data.patient_id.split('-')[3]) == data.value
        && !exists(patient) && validProfile(getAfter(patient).data, data.patient_id);
    }
    // Temporary public viewing, requested by the owner. Sign-in is not required.
    match /patients/{patientId} {
      allow read: if true;
      allow create: if validProfile(request.resource.data, patientId) && registrationCounterMatches(patientId);
      allow update: if false;
      allow delete: if true;
      match /{record=**} {
        allow read: if true;
        allow create, update: if false;
        allow delete: if true;
      }
    }
    // A new profile and the next website counter must be committed together.
    match /registration_counters/{prefix} {
      allow get: if webPrefix(prefix);
      allow list, delete: if false;
      allow create: if validCounter(request.resource.data, prefix) && request.resource.data.value == 1;
      allow update: if validCounter(request.resource.data, prefix) && request.resource.data.value == resource.data.value + 1;
    }
    // Access entries and measurements are managed by the gateway/Admin SDK.
    // Patient deletion is public for now; measurement creation/edits remain blocked.
    match /{document=**} { allow read, write: if false; }
  }
}
```

The earlier private rules are retained locally at
`Website/.deployment-backups/firestore-rules-private-20261112.rules`.
Use them as a reference when private access is restored; include any registration
and deletion behavior required at that time.

### Deployment and verification

From the `Website` directory, deploy rules separately from the Vercel website:

```powershell
npx firebase-tools@15.35.0 deploy --only firestore:rules --project immortals-3 --account tirthankar.dgen@gmail.com --non-interactive
```

Push website changes to GitHub `main`; the linked Vercel project builds and
publishes that commit to the production domain. Firebase rules are a separate
deployment and must be checked against the release listed above.

Validation completed for this update: 11 model/profile tests and 9 Firestore
emulator tests passed, including simultaneous registration, public access,
atomic counters, rejected edits, and deletion isolation. Lint, type checking,
and the production build passed. A real browser created a temporary patient
without sign-in, verified its Sender_v2-style ID, deleted it, and confirmed
Firestore returned 404. Desktop viewport checks passed at 1280×600 and
1440×800; mobile width was checked at 390 pixels. The 1200×630 sharing image,
page metadata, icons, and manifest were also checked.
