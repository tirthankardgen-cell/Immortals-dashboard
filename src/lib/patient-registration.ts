import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';
import { getFirebase } from './firebase.ts';
import { createPatientProfile, registrationPrefix, validatePatientInput, type PatientInput } from './patient-profile.ts';

export async function registerPatient(input: PatientInput, db: Firestore = getFirebase().db, now = new Date()) {
  const values = validatePatientInput(input);
  const counterRef = doc(db, 'registration_counters', registrationPrefix(now));
  for (let attempt = 0; attempt < 5; attempt++) {
    let observed = -1;
    try { return await runTransaction(db, async transaction => {
    const counter = await transaction.get(counterRef);
    const previous = counter.exists() ? counter.data().value : 0;
    observed = previous;
    if (!Number.isInteger(previous) || previous < 0 || previous >= 999_999_999)
      throw new Error('The patient registration counter is unavailable.');
    const patient = createPatientProfile(values, previous + 1, now);
    const patientRef = doc(db, 'patients', patient.patient_id);
    if ((await transaction.get(patientRef)).exists())
      throw new Error('This patient ID is already registered. Please try again or contact your administrator.');
    transaction.set(patientRef, patient);
    transaction.set(counterRef, { value: previous + 1, patient_id: patient.patient_id });
    return patient;
    }); } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (!code.includes('permission-denied') || observed < 0 || attempt === 4) throw error;
      // Retry only if another creator advanced the counter before rule evaluation.
      const current = await getDoc(counterRef);
      if (!current.exists() || current.data().value <= observed) throw error;
    }
  }
  throw new Error('Patient registration is busy. Please try again.');
}
