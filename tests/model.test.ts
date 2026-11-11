import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metric, monitoringState, normalizeReading, normalizeTranscript, timestamp, waveformPath } from '../src/lib/model.ts';

const now = Date.parse('2026-11-11T12:00:00Z');
const makeReading = (extra: Record<string, unknown> = {}) => normalizeReading('PAT-A', 'reading-1', {
  patient_id: 'PAT-A', captured_at: now - 1000, uploaded_at: now,
  sensors: {
    pulse: { status: 'Live', age_seconds: .2, values: { heart_rate_bpm: 76, spo2_percent: 98.5 } },
    ecg: { status: 'Noisy input', age_seconds: .2, values: { heart_rate_bpm: null, candidate_bpm: 48 } },
    mlx: { status: 'Live', age_seconds: .2, values: { object_c: 28.7 } },
    dht: { status: 'Live', age_seconds: 5, values: { temperature_c: 28.3 } },
  }, ...extra,
});
test('document association prevents readings and speech crossing patients', () => {
  assert.equal(makeReading({ patient_id: 'PAT-B' }), null);
  assert.equal(normalizeTranscript('PAT-A', 'speech', { patient_id: 'PAT-B' }), null);
});
test('capture time controls freshness, even after a recent upload', () => {
  const old = makeReading({ captured_at: now-10000, uploaded_at: now });
  assert.equal(monitoringState(old, now), 'stale');
  assert.equal(metric(old, 'pulse', 'heart_rate_bpm', now), null);
  assert.equal(metric(old, 'pulse', 'heart_rate_bpm', now, true), 76);
});
test('freshness expires without a new database event and preserves source age', () => {
  const reading = makeReading();
  assert.equal(metric(reading, 'pulse', 'heart_rate_bpm', now), 76);
  assert.equal(metric(reading, 'pulse', 'heart_rate_bpm', now+3000), null);
  assert.equal(metric(reading, 'dht', 'temperature_c', now), 28.3);
  assert.equal(metric(reading, 'dht', 'temperature_c', now+1500), null);
});
test('invalid times and nonnumeric measurements do not become live readings', () => {
  assert.equal(timestamp('not a date'), null);
  assert.equal(timestamp({ toMillis: () => Infinity }), null);
  assert.equal(timestamp({ seconds: 100, nanoseconds: 500000000 }), 100500);
  assert.equal(monitoringState(makeReading({ captured_at: now+6000 }), now), 'unknown');
  assert.equal(metric(makeReading({ sensors: { pulse: { age_seconds: .1, values: { heart_rate_bpm: '76' } } } }), 'pulse', 'heart_rate_bpm', now), null);
});
test('optical heart rate, provisional ECG rate and measured surface stay distinct', () => {
  const reading = makeReading();
  assert.equal(metric(reading, 'pulse', 'heart_rate_bpm', now), 76);
  assert.equal(metric(reading, 'ecg', 'heart_rate_bpm', now), null);
  assert.equal(metric(reading, 'ecg', 'candidate_bpm', now), 48);
  assert.equal(metric(reading, 'mlx', 'object_c', now), 28.7);
});
test('waveform gaps are separate paths and clear markers remove traces', () => {
  const wave = { times: [-500, -480, -300, -280], values: [0, 1, -1, 0], unit: 'mV at ADC', clear: false };
  assert.equal((waveformPath(wave, 'ecg').match(/M/g) ?? []).length, 2);
  assert.equal(waveformPath({ ...wave, clear: true }, 'ecg'), '');
  assert.equal(waveformPath({ ...wave, times: [] }, 'ecg'), '');
});
test('speech keeps anonymous labels and rejects malformed segments', () => {
  const speech = normalizeTranscript('PAT-A', 'speech', { patient_id: 'PAT-A', segments: [
    { start_ms: 0, end_ms: 900, text: 'Hello' }, { start_ms: 500, end_ms: 100, text: 'Invalid' },
  ] });
  assert.equal(speech?.segments.length, 1);
  assert.equal(speech?.segments[0].speakerId, 'Unknown speaker');
});
