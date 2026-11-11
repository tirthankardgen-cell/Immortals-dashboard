import type { Patient, Reading, Transcript } from './model';

// Fictional, static preview fixtures. They never write to Firebase or appear as live readings.
const captured = Date.parse('2026-11-11T14:42:00Z');
const names = ['Demo Patient', 'Aanya Mehta', 'Arjun Rao', 'Meera Iyer',
  'Kabir Shah', 'Sara Thomas', 'Vihaan Nair', 'Zoya Khan'];
export const previewPatients: Patient[] = names.map((name, i) => ({
  id: `DEMO-${String(i+1).padStart(3, '0')}`, name, age: [32, 28, 46, 37, 54, 25, 41, 30][i],
  sex: i % 2 === 0 ? 'Male' : 'Female', registeredAt: captured - (i+1)*86400000,
  deviceId: i < 3 ? `DEMO-SENDER-${i+1}` : null, ward: ['A', 'A', 'B', 'B', 'C', 'A', 'B', 'C'][i],
  bed: String(i+1).padStart(2, '0'), clinician: 'Sample clinician', contact: null,
  notes: 'Fictional record for interface preview. Measurements and waveforms are sample data.',
}));
function makeWave(kind: 'pulse' | 'ecg') {
  const count = kind === 'ecg' ? 1000 : 200;
  const pairs = Array.from({ length: count }, (_, i) => {
    const t = -8000+i*8000/(count-1), phase = ((t+8000)/800)%1;
    const value = kind === 'pulse'
      ? Math.sin(phase*2*Math.PI) + .22*Math.sin(phase*4*Math.PI)
      : .1*Math.sin(phase*2*Math.PI) + 1.3*Math.exp(-(((phase-.35)/.018)**2))
        -.28*Math.exp(-(((phase-.39)/.025)**2))+.2*Math.exp(-(((phase-.65)/.08)**2));
    return [t, value];
  });
  return { times: pairs.map(pair => pair[0]), values: pairs.map(pair => pair[1]),
    unit: kind === 'ecg' ? 'mV at ADC' : 'relative amplitude', clear: false };
}
export function previewReading(patientId: string): Reading | null {
  const index = previewPatients.findIndex(patient => patient.id === patientId);
  if (index < 0 || index > 4) return null;
  return {
    id: 'sample-latest', patientId, sessionId: `DEMO-SESSION-${index+1}`,
    deviceId: `DEMO-SENDER-${index+1}`, capturedAt: captured-index*120000,
    receivedAt: captured+500, uploadedAt: captured+800,
    sensors: {
      pulse: { status: 'Preview measurement', ageSeconds: .1,
        values: { heart_rate_bpm: 76+index*2, spo2_percent: 98.7-index*.2, quality_percent: 94 } },
      ecg: { status: 'Preview waveform', ageSeconds: .1,
        values: { heart_rate_bpm: 75+index*2, candidate_bpm: null, quality_percent: 90 } },
      mlx: { status: 'Preview measurement', ageSeconds: .3, values: { object_c: 33.8+index*.1, ambient_c: 28.4 } },
      dht: { status: 'Preview measurement', ageSeconds: 1.2, values: { temperature_c: 28.3, humidity_percent: 72.0 } },
      bmp: { status: 'Preview measurement', ageSeconds: .5, values: { pressure_hpa: 1017.6, temperature_c: 28.7 } },
    }, waveforms: { pulse: makeWave('pulse'), ecg: makeWave('ecg') },
  };
}
export function previewHistory(patientId: string): Reading[] {
  const reading = previewReading(patientId);
  return reading ? Array.from({ length: 7 }, (_, i) => ({ ...reading, id: `sample-reading-${i}`,
    capturedAt: captured-i*60000, sensors: { ...reading.sensors,
      pulse: { ...reading.sensors.pulse!, values: { ...reading.sensors.pulse!.values,
        heart_rate_bpm: 76+[0, 2, -1, 3, 1, -2, 0][i] } } } })) : [];
}
export function previewTranscripts(patientId: string): Transcript[] {
  return patientId === 'DEMO-001' ? [{ id: 'sample-transcript', patientId,
    sessionId: 'DEMO-SESSION-1', startedAt: captured-180000, language: 'English',
    model: 'whisper.cpp base · sample', segments: [
      { startMs: 0, endMs: 3800, speakerId: 'Speaker 1', text: 'Please keep your hand relaxed while we take the readings.' },
      { startMs: 4600, endMs: 7400, speakerId: 'Speaker 2', text: 'Okay, I am ready.' },
      { startMs: 8100, endMs: 11600, speakerId: 'Speaker 1', text: 'Thank you. We will finish in a moment.' },
    ] }] : [];
}
