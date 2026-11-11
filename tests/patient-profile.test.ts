import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPatientProfile, registrationPrefix, validatePatientInput } from '../src/lib/patient-profile.ts';

const input = { name: '  Patient name  ', age: 32, sex: 'Female' };
test('registration uses the sender v2 India date and code structure at midnight', () => {
  assert.equal(registrationPrefix(new Date('2026-11-11T18:29:59Z')), 'IMM-20261111-57454201');
  assert.equal(registrationPrefix(new Date('2026-11-11T18:30:00Z')), 'IMM-20261112-57454201');
  const profile = createPatientProfile(input, 1, new Date('2026-11-11T18:30:00Z'));
  assert.equal(profile.patient_id, 'IMM-20261112-57454201-00001');
  assert.equal(profile.patient_code, profile.patient_id);
  assert.match(profile.patient_uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(profile.name, 'Patient name');
  assert.equal(profile.created_at, profile.age_recorded_at);
});
test('counter padding expands without truncation and refuses invalid sequences', () => {
  assert.ok(createPatientProfile(input, 100000, new Date()).patient_id.endsWith('-100000'));
  for (const value of [0, -1, 1.5, 1_000_000_000]) assert.throws(() => createPatientProfile(input, value, new Date()));
});
test('registration enforces the sender v2 profile field limits', () => {
  for (const name of ['', '   ', 'A'.repeat(81), 'Name\n']) assert.throws(() => validatePatientInput({ ...input, name }));
  for (const age of [-1, 131, 2.5, Number.NaN, true]) assert.throws(() => validatePatientInput({ ...input, age: age as number }));
  assert.throws(() => validatePatientInput({ ...input, sex: '' }));
  assert.equal(validatePatientInput({ ...input, age: 0, sex: 'Prefer not to say' }).age, 0);
});
