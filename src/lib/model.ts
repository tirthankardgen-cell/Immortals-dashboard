export type SensorName = 'pulse' | 'ecg' | 'mlx' | 'dht' | 'bmp';
export type Values = Record<string, number | string | boolean | null>;
export type Sensor = { status: string; ageSeconds: number | null; values: Values };
export type Waveform = { times: number[]; values: number[]; unit: string; clear: boolean };
export type Patient = {
  id: string; displayId?: string; name: string; age: number | null; sex: string;
  registeredAt: number | null; deviceId: string | null; ward: string | null;
  bed: string | null; clinician: string | null; contact: string | null; notes: string | null;
};
export type Reading = {
  id: string; patientId: string; sessionId: string | null; deviceId: string | null;
  capturedAt: number | null; receivedAt: number | null; uploadedAt: number | null;
  sensors: Partial<Record<SensorName, Sensor>>;
  waveforms: Partial<Record<'pulse' | 'ecg', Waveform>>;
  recordingMode?: string;
};
export type Transcript = {
  id: string; patientId: string; sessionId: string | null; startedAt: number | null;
  language: string | null; model: string | null;
  segments: { startMs: number; endMs: number; speakerId: string; text: string }[];
};
export type MonitoringState = 'monitoring' | 'stale' | 'waiting' | 'unknown';

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
export function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
export function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function timestamp(value: unknown): number | null {
  if (value instanceof Date) return finite(value.getTime());
  if (typeof value === 'string') return finite(Date.parse(value));
  if (typeof value === 'number') return finite(value);
  const item = record(value);
  if (typeof item.toMillis === 'function') {
    try { return finite(item.toMillis()); } catch { return null; }
  }
  const seconds = finite(item.seconds);
  const nanos = finite(item.nanoseconds) ?? 0;
  return seconds === null ? null : seconds * 1000 + nanos / 1e6;
}
export function normalizePatient(id: string, data: unknown): Patient {
  const item = record(data), profile = record(item.profile_details);
  const age = finite(item.age ?? profile.age);
  return {
    id, displayId: text(item.patient_code) ?? text(item.patient_id) ?? id, name: text(item.name) ?? 'Unnamed patient',
    age: age !== null && age >= 0 && age <= 130 ? age : null,
    sex: text(item.sex ?? profile.sex) ?? 'Not entered',
    registeredAt: timestamp(item.created_at), deviceId: text(item.device_id),
    ward: text(profile.ward ?? item.ward), bed: text(profile.bed ?? item.bed),
    clinician: text(profile.clinician ?? profile.assigned_clinician),
    contact: text(profile.contact ?? profile.contact_information), notes: text(profile.notes),
  };
}
export function normalizeReading(patientId: string, id: string, data: unknown): Reading | null {
  const item = record(data);
  if (text(item.patient_id) && item.patient_id !== patientId) return null;
  const sensors: Reading['sensors'] = {}, waves: Reading['waveforms'] = {};
  const rawSensors = record(item.sensors);
  for (const name of ['pulse', 'ecg', 'mlx', 'dht', 'bmp'] as const) {
    if (!(name in rawSensors)) continue;
    const state = record(rawSensors[name]), values: Values = {};
    for (const [key, value] of Object.entries(record(state.values))) {
      values[key] = typeof value === 'number' ? finite(value)
        : typeof value === 'string' || typeof value === 'boolean' ? value : null;
    }
    const age = finite(state.age_seconds);
    sensors[name] = { status: text(state.status) ?? 'Status unavailable',
      ageSeconds: age !== null && age >= 0 ? age : null, values };
  }
  const rawWaves = record(item.waveforms);
  for (const name of ['pulse', 'ecg'] as const) {
    if (!(name in rawWaves)) continue;
    const raw = record(rawWaves[name]);
    const times = Array.isArray(raw.time_offset_ms) ? raw.time_offset_ms : [];
    const values = Array.isArray(raw.values) ? raw.values : [];
    const pairs = times.length === values.length ? times.map((time, i) => [finite(time), finite(values[i])])
      .filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null)
      .slice(-4000) : [];
    waves[name] = { times: pairs.map(pair => pair[0]), values: pairs.map(pair => pair[1]),
      unit: text(raw.unit) ?? (name === 'ecg' ? 'mV at ADC' : 'relative amplitude'), clear: raw.clear === true };
  }
  return { id, patientId, sessionId: text(item.monitoring_session_id), deviceId: text(item.device_id ?? item.sender_id),
    capturedAt: timestamp(item.captured_at ?? item.timestamp), receivedAt: timestamp(item.received_at),
    uploadedAt: timestamp(item.uploaded_at), sensors, waveforms: waves, recordingMode: text(item.recording_mode) ?? undefined };
}
export function normalizeTranscript(patientId: string, id: string, data: unknown): Transcript | null {
  const item = record(data);
  if (text(item.patient_id) && item.patient_id !== patientId) return null;
  const segments = (Array.isArray(item.segments) ? item.segments : []).flatMap(value => {
    const segment = record(value), content = text(segment.text);
    const startMs = finite(segment.start_ms), endMs = finite(segment.end_ms);
    return content && startMs !== null && endMs !== null && startMs >= 0 && endMs >= startMs
      ? [{ startMs, endMs, speakerId: text(segment.speaker_id) ?? 'Unknown speaker', text: content }] : [];
  }).sort((a, b) => a.startMs - b.startMs);
  return { id, patientId, sessionId: text(item.monitoring_session_id), startedAt: timestamp(item.started_at),
    language: text(item.language), model: text(item.transcription_model), segments };
}
export function monitoringState(reading: Reading | null, now: number): MonitoringState {
  if (!reading) return 'waiting';
  if (reading.capturedAt === null || reading.capturedAt > now + 5000) return 'unknown';
  return Math.max(0, now - reading.capturedAt) <= 3000 ? 'monitoring' : 'stale';
}
export function metric(reading: Reading | null, sensor: SensorName, field: string, now: number,
  recorded = false): number | null {
  const state = reading?.sensors[sensor];
  if (!state) return null;
  if (!recorded && !sensorFresh(reading, sensor, now)) return null;
  return finite(state.values[field]);
}
export function sensorFresh(reading: Reading | null, sensor: SensorName, now: number): boolean {
  const state = reading?.sensors[sensor];
  if (!state || monitoringState(reading, now) !== 'monitoring' || state.ageSeconds === null) return false;
  const age = state.ageSeconds + Math.max(0, now - (reading?.capturedAt ?? now)) / 1000;
  return age <= (sensor === 'dht' ? 7 : 3);
}
export function displayNumber(value: number | null, decimals = 1): string {
  return value === null ? '—' : value.toFixed(decimals);
}
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}
export function formatTime(value: number | null, includeDate = false): string {
  if (value === null) return 'No reading yet';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata',
    ...(includeDate ? { day: '2-digit', month: 'short', year: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
}
export function waveformPath(wave: Waveform | undefined, kind: 'pulse' | 'ecg', width = 600, height = 150): string {
  if (!wave || wave.clear || wave.values.length < 4 || wave.times.length !== wave.values.length) return '';
  const pairs = wave.times.map((time, i) => [time, wave.values[i]])
    .filter(([time, value]) => time >= -8000 && time <= 0 && Number.isFinite(value))
    .sort((a, b) => a[0] - b[0]);
  if (pairs.length < 4) return '';
  let low = Infinity, high = -Infinity;
  for (const [, value] of pairs) { low = Math.min(low, value); high = Math.max(high, value); }
  const padding = Math.max(.05, (high-low)*.15);
  low -= padding; high += padding;
  return pairs.map(([time, value], i) => {
    const gap = i === 0 || time - pairs[i-1][0] > (kind === 'ecg' ? 24 : 100) || time === pairs[i-1]?.[0];
    const px = width*(time+8000)/8000, py = height*(1-(value-low)/(high-low));
    return `${gap ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
  }).join(' ');
}
