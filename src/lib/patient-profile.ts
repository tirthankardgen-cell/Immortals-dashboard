export const PATIENT_SEXES = ['Female', 'Male', 'Other', 'Prefer not to say'] as const;
// Separate registrar namespace; sender v2 uses its XBee address suffix.
export const WEBSITE_REGISTRAR = '57454201';
export type PatientInput = { name: string; age: number; sex: string };
export type PatientProfile = PatientInput & {
  patient_id: string; patient_code: string; patient_uuid: string;
  created_at: string; age_recorded_at: string;
};

export function validatePatientInput(input: PatientInput): PatientInput {
  if (typeof input.name !== 'string' || Array.from(input.name).some(character => character.charCodeAt(0) < 32)
    || Array.from(input.name.trim()).length < 1 || Array.from(input.name.trim()).length > 80)
    throw new Error('Enter a patient name between 1 and 80 characters.');
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 130)
    throw new Error('Age must be a whole number from 0 to 130.');
  if (!PATIENT_SEXES.some(sex => sex === input.sex)) throw new Error('Choose a sex option.');
  return { name: input.name.trim(), age: input.age, sex: input.sex };
}

export function registrationPrefix(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Registration time is unavailable.');
  const indiaDate = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10).replaceAll('-', '');
  return `IMM-${indiaDate}-${WEBSITE_REGISTRAR}`;
}

export function createPatientProfile(input: PatientInput, sequence: number, now: Date): PatientProfile {
  const values = validatePatientInput(input);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999_999)
    throw new Error('The patient registration counter is unavailable.');
  const code = `${registrationPrefix(now)}-${String(sequence).padStart(5, '0')}`;
  const created = now.toISOString();
  return { ...values, patient_id: code, patient_code: code, patient_uuid: crypto.randomUUID(),
    created_at: created, age_recorded_at: created };
}
