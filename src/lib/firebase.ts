import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyAprY7F6j48OH2q1jdwgKlr-WwHioKt9jw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'immortals-3.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'immortals-3',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'immortals-3.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '515749825593',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:515749825593:web:1b55995c75735beca511e8',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-WJH0J7G1ZB',
};

export function getFirebase() {
  const app = getApps().find(item => item.name === 'immortals-dashboard')
    ?? initializeApp(firebaseConfig, 'immortals-dashboard');
  return { app, db: getFirestore(app), auth: getAuth(app) };
}

export async function enableAnalytics() {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true' || typeof window === 'undefined') return;
  const { isSupported, getAnalytics } = await import('firebase/analytics');
  if (await isSupported()) getAnalytics(getFirebase().app);
}

export type DataError = { kind: 'access' | 'network' | 'configuration' | 'unknown'; message: string };
export function dataError(error: unknown): DataError {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied') || code.includes('unauthenticated'))
    return { kind: 'access', message: 'These patient records need authorized access.' };
  if (code.includes('unavailable') || code.includes('deadline'))
    return { kind: 'network', message: 'We could not reach your patient records. Please try again.' };
  if (code.includes('failed-precondition') || code.includes('not-found') || code.includes('invalid-argument'))
    return { kind: 'configuration', message: 'Your patient connection is awaiting setup.' };
  return { kind: 'unknown', message: 'Patient records could not be loaded. Please try again.' };
}
