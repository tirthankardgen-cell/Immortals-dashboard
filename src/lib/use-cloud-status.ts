'use client';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { useWorkspace } from '@/components/workspace-provider';
import { dataError, getFirebase } from './firebase';

export function useCloudStatus() {
  const { preview, online, refreshKey, user } = useWorkspace();
  const key = `${refreshKey}:${user?.uid ?? 'anonymous'}`;
  const [state, setState] = useState({ key: '', label: 'Connecting', message: 'Connecting to Firebase' });
  useEffect(() => {
    if (preview) return;
    const timer = setTimeout(() => setState(previous => previous.key === key ? previous
      : { key, label: 'Unavailable', message: 'The Firebase connection is taking longer than expected.' }), 12000);
    const unsubscribe = onSnapshot(query(collection(getFirebase().db, 'patients'), limit(1)), { includeMetadataChanges: true }, snapshot => {
      clearTimeout(timer);
      setState({ key, label: snapshot.metadata.fromCache ? 'Cached' : 'Connected',
        message: snapshot.metadata.fromCache ? 'Showing cached Firebase records' : 'Connected to the Firebase patient database' });
    }, error => { clearTimeout(timer); setState({ key, label: 'Unavailable', message: dataError(error).message }); });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [preview, key]);
  const label = preview ? 'Sample data' : !online ? 'Offline' : state.key === key ? state.label : 'Connecting';
  return { label, message: !online ? 'No internet connection' : state.key === key ? state.message : 'Connecting to Firebase',
    color: preview ? 'var(--blue)' : label === 'Connected' ? 'var(--green)' : 'var(--gold)' };
}
