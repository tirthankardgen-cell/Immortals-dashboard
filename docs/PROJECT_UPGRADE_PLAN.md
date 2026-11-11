# Immortals: two-phase upgrade

## Phase 1: patient monitoring and cloud dashboard

The sender Raspberry Pi collects sensor data for a confirmed patient and sends
it over Zigbee. The second Raspberry Pi acts as the receiving gateway: it validates
the messages and uploads them to Cloud Firestore through an independent worker.
Each patient has a persistent unique ID. Profiles, current measurements, and
historical readings are stored under that ID, with device and monitoring-session
IDs so records cannot be mixed between patients.

The website lists patient names and IDs. Selecting a patient opens their details,
vitals, measurement history, and monitoring status. Firebase Authentication and
restricted Firestore rules protect patient records. Vercel hosts this standalone
Next.js website; Firebase hosts the database and authentication services.

The layout follows this priority:

1. Patient information forms the top header: name, unique ID, age, sex, and details.
2. Vitals occupy the largest area: optical heart rate, estimated SpO2, measured
   infrared surface temperature, pulse waveform, and the separately labelled ECG.
3. Environmental measurements use small cards on the right: room temperature,
   humidity, pressure, and board temperature. They stack below vitals on mobile.

Unavailable and stale measurements remain explicit. A provisional ECG rate is
labelled unreliable, and an infrared surface measurement is not adjusted to invent
a core-body temperature. Fictional previews remain separate from live records.

Phase 1 is complete end to end when patient selection/registration on the sender,
patient-associated Zigbee messages, gateway uploads, private cloud reads, and the
website display have all been verified together. Delivering this website does
not by itself complete the sender and gateway integration.

## Phase 2: offline speech and speaker differentiation

An external microphone on the sender Pi captures speech for the selected patient
and monitoring session. The planned local stack is whisper.cpp with the Whisper
base model for transcription and Sherpa-ONNX for speaker differentiation, subject
to performance validation on the actual Pi.

Speaker-labelled transcripts follow the same Zigbee, gateway, and Firebase path.
The patient's Transcripts tab presents them by session and time. Speaker labels
remain anonymous unless identity has been explicitly established; the patient's
name does not identify every speaker.

Audio processing and cloud uploads must preserve independent sensor acquisition,
local display, and Zigbee operation. Interrupted uploads need a bounded durable
queue and retry policy, and transcript events need persistent IDs to avoid
duplicates after retries.

The website includes the transcript view and Firestore subscriptions. Microphone
capture, local models, transcript transport, and gateway uploads require separate
implementation and hardware verification before Phase 2 can be declared complete.
