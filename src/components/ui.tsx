'use client';
import Link from 'next/link';
import { LoaderCircle, ShieldCheck, UsersRound } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import type { DataError } from '@/lib/firebase';

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = { sample: 'Sample data', monitoring: 'Monitoring',
    recorded: 'Recorded', stale: 'No recent data', waiting: 'No session', unknown: 'Checking' };
  return <span className={`status-pill ${status}`}><span />{labels[status] ?? status}</span>;
}
export function DataMessage({ error, empty = false, missing = false }: {
  error?: DataError | null; empty?: boolean; missing?: boolean;
}) {
  const { refresh, href } = useWorkspace();
  return <div className="empty" role={error ? 'status' : undefined}>
    <div className="empty-symbol">{error?.kind === 'access' ? <ShieldCheck size={25}/> : <UsersRound size={25}/>}</div>
    <h2>{missing ? 'Patient not found' : empty ? 'Your patient directory starts here'
      : error?.kind === 'access' ? 'Patient access is protected' : 'Let’s connect your patient records'}</h2>
    <p>{missing ? 'This patient record is not available in the selected workspace.'
      : empty ? 'Create a patient record here, or choose one saved by your gateway. Select a name to open the complete record.'
      : error?.message ?? 'Your records are not available yet.'}</p>
    <div className="flex justify-center flex-wrap gap-2">
      {missing ? <Link className="button" href={href('/')}>Back to patients</Link> : <button className="button" onClick={refresh}>Try again</button>}
      {empty && <Link className="button primary" href={href('/patients/new')}>New patient</Link>}
    </div>
  </div>;
}
export function LoadingPanel({ label = 'Loading patient records' }: { label?: string }) {
  return <div className="empty" role="status"><LoaderCircle className="mx-auto mb-6 mint animate-spin" size={24}/>
    <p>{label}</p><div className="loading-block mx-auto max-w-64"/><div className="loading-block mx-auto max-w-48 mt-3"/></div>;
}
export function LaunchScreen() {
  return <div className="min-h-screen grid place-items-center"><div className="text-center">
    <div className="eyebrow mint mb-5">IMMORTALS</div><LoaderCircle className="mx-auto mint animate-spin" size={22}/>
    <p className="text-xs muted mt-5">Opening your workspace</p></div></div>;
}
