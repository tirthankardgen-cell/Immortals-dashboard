'use client';
import { useCallback, useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useWorkspace } from '@/components/workspace-provider';
import { dataError, getFirebase, type DataError } from './firebase';
import { normalizePatient, normalizeReading, normalizeTranscript, type Patient, type Reading, type Transcript } from './model';
import { previewHistory, previewPatients, previewReading, previewTranscripts } from './preview';

export type DataState<T> = { key: string; status: 'loading' | 'ready' | 'error';
  data: T; error: DataError | null; cached: boolean };
const timeoutError: DataError = { kind: 'network', message: 'The patient connection is taking longer than expected. Please try again.' };
const loading = <T,>(key: string, data: T): DataState<T> => ({ key, status: 'loading', data, error: null, cached: false });
const ready = <T,>(key: string, data: T, cached = false): DataState<T> => ({ key, status: 'ready', data, error: null, cached });

function useLiveCollection<T>(path: string, decode: (id: string, raw: unknown) => T | null,
  previewData: T[], orderedField?: string): DataState<T[]> {
  const { preview, refreshKey, user } = useWorkspace();
  const key = `${path}:${refreshKey}:${user?.uid ?? 'anonymous'}`;
  const [state, setState] = useState<DataState<T[]>>(loading('', []));
  useEffect(() => {
    if (preview) return;
    let settled = false;
    const timer = setTimeout(() => { if (!settled) setState({ ...loading(key, []), status: 'error', error: timeoutError }); }, 12000);
    const source = collection(getFirebase().db, path);
    const target = orderedField ? query(source, orderBy(orderedField, 'desc'), limit(50)) : source;
    const unsubscribe = onSnapshot(target, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache && snapshot.empty) return;
      settled = true;
      setState(ready(key, snapshot.docs.flatMap(item => {
        const value = decode(item.id, item.data()); return value ? [value] : [];
      }), snapshot.metadata.fromCache));
    }, error => { settled = true; setState({ ...loading(key, []), status: 'error', error: dataError(error) }); });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [preview, path, decode, orderedField, key]);
  return preview ? ready('preview', previewData) : state.key === key ? state : loading(key, []);
}
const decodePatient = (id: string, raw: unknown) => normalizePatient(id, raw);
export function usePatients(): DataState<Patient[]> {
  return useLiveCollection('patients', decodePatient, previewPatients);
}

function useLiveDocument<T>(path: string, decode: (id: string, raw: unknown) => T | null,
  previewData: T | null): DataState<T | null> {
  const { preview, refreshKey, user } = useWorkspace();
  const key = `${path}:${refreshKey}:${user?.uid ?? 'anonymous'}`;
  const [state, setState] = useState<DataState<T | null>>(loading('', null));
  useEffect(() => {
    if (preview) return;
    let settled = false;
    const timer = setTimeout(() => { if (!settled) setState({ ...loading(key, null), status: 'error', error: timeoutError }); }, 12000);
    const unsubscribe = onSnapshot(doc(getFirebase().db, path), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache && !snapshot.exists()) return;
      settled = true;
      const value = snapshot.exists() ? decode(snapshot.id, snapshot.data()) : null;
      if (snapshot.exists() && value === null) {
        setState({ ...loading(key, null), status: 'error', error: { kind: 'unknown', message: 'This record could not be verified.' } });
      } else setState(ready(key, value, snapshot.metadata.fromCache));
    }, error => { settled = true; setState({ ...loading(key, null), status: 'error', error: dataError(error) }); });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [preview, path, decode, key]);
  return preview ? ready('preview', previewData) : state.key === key ? state : loading(key, null);
}
export function usePatient(id: string) {
  return useLiveDocument(`patients/${id}`, decodePatient, previewPatients.find(patient => patient.id === id) ?? null);
}
export function useLatest(id: string) {
  const decode = useCallback((docId: string, raw: unknown) => normalizeReading(id, docId, raw), [id]);
  return useLiveDocument(`patients/${id}/monitoring/latest`, decode, previewReading(id));
}
export function useHistory(id: string): DataState<Reading[]> {
  const decode = useCallback((docId: string, raw: unknown) => normalizeReading(id, docId, raw), [id]);
  return useLiveCollection(`patients/${id}/readings`, decode, previewHistory(id), 'captured_at');
}
export function useTranscripts(id: string): DataState<Transcript[]> {
  const decode = useCallback((docId: string, raw: unknown) => normalizeTranscript(id, docId, raw), [id]);
  return useLiveCollection(`patients/${id}/transcripts`, decode, previewTranscripts(id), 'started_at');
}

export function useDirectoryReadings(ids: string[]) {
  const { preview, refreshKey, user } = useWorkspace(), idsKey = JSON.stringify(ids);
  const key = `${idsKey}:${refreshKey}:${user?.uid ?? 'anonymous'}`;
  const [state, setState] = useState<{ key: string; data: Record<string, Reading | null | undefined>; errors: Record<string, DataError> }>({ key: '', data: {}, errors: {} });
  useEffect(() => {
    if (preview) return;
    const patientIds: string[] = JSON.parse(idsKey);
    const timer = setTimeout(() => setState(previous => {
      const current = previous.key === key ? previous : { key, data: {}, errors: {} };
      const errors = { ...current.errors };
      patientIds.forEach(id => { if (current.data[id] === undefined) errors[id] = timeoutError; });
      return { ...current, errors };
    }), 12000);
    const subscriptions = patientIds.map(id => onSnapshot(doc(getFirebase().db, `patients/${id}/monitoring/latest`), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache && !snapshot.exists()) return;
      setState(previous => {
        const errors = { ...(previous.key === key ? previous.errors : {}) }; delete errors[id];
        return { key, errors, data: { ...(previous.key === key ? previous.data : {}),
          [id]: snapshot.exists() ? normalizeReading(id, snapshot.id, snapshot.data()) : null } };
      });
    }, error => setState(previous => ({ key, data: previous.key === key ? previous.data : {},
      errors: { ...(previous.key === key ? previous.errors : {}), [id]: dataError(error) } }))));
    return () => { clearTimeout(timer); subscriptions.forEach(unsubscribe => unsubscribe()); };
  }, [preview, idsKey, key]);
  const readings = preview ? Object.fromEntries(ids.map(id => [id, previewReading(id)])) : state.key === key ? state.data : {};
  const errors = preview || state.key !== key ? {} : state.errors;
  return { readings, pending: ids.some(id => readings[id] === undefined && !errors[id]), error: Object.values(errors)[0] ?? null };
}
