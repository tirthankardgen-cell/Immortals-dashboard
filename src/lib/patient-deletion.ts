import { collection, deleteDoc, doc, getDocs, limit, query, writeBatch, type Firestore } from 'firebase/firestore';
import { getFirebase } from './firebase.ts';

export async function deletePatient(patientId: string, db: Firestore = getFirebase().db) {
  if (!patientId || patientId.includes('/') || patientId.length > 256) throw new Error('Invalid patient ID.');
  // Firestore does not delete subcollections when their parent is removed.
  // Clear the gateway's record collections before deleting the patient profile.
  for (const records of ['monitoring', 'readings', 'sessions', 'transcripts']) {
    const target = collection(db, 'patients', patientId, records);
    for (;;) {
      const snapshot = await getDocs(query(target, limit(200)));
      if (snapshot.empty) break;
      const batch = writeBatch(db);
      snapshot.docs.forEach(record => batch.delete(record.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, 'patients', patientId));
}
