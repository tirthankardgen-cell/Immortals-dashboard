'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import type { Patient } from '@/lib/model';
import { deletePatient } from '@/lib/patient-deletion';
import { useWorkspace } from './workspace-provider';

export function DeletePatientButton({ patient }: { patient: Patient }) {
  const router = useRouter(), { preview, online } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null), [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const remove = async () => {
    if (preview || busy) return;
    setError('');
    if (!online) { setError('Connect to the internet to delete this patient.'); return; }
    setBusy(true);
    try { await deletePatient(patient.id); setOpen(false); router.replace('/'); }
    catch { setError('Deletion could not be completed. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <button className="button danger" disabled={preview} onClick={() => { setError(''); setOpen(true); }} title={preview ? 'Preview records cannot be deleted' : undefined}><Trash2 size={13}/>Delete patient</button>
    <dialog ref={dialog} className="modal delete-dialog" aria-labelledby="delete-patient-title"
      onCancel={event => { if (busy) event.preventDefault(); else setOpen(false); }}
      onClick={event => { if (event.target === dialog.current && !busy) setOpen(false); }}>
      <div className="flex items-center justify-between"><Trash2 size={24} className="delete-color"/><button disabled={busy} className="icon-button" aria-label="Cancel patient deletion" onClick={() => setOpen(false)}><X size={17}/></button></div>
      <h2 id="delete-patient-title">Delete this patient?</h2>
      <div className="delete-patient-name">{patient.name}</div><div className="mono text-[10px] muted mt-2">{patient.displayId ?? patient.id}</div>
      <p>This permanently removes the patient profile and its saved vitals, monitoring sessions, history, and transcripts from the cloud.</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="flex justify-end gap-3 mt-5"><button className="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
        <button className="button danger solid" disabled={busy} onClick={() => void remove()}>{busy ? <LoaderCircle size={14} className="animate-spin"/> : <Trash2 size={14}/>} {busy ? 'Deleting patient…' : 'Delete permanently'}</button></div>
    </dialog>
  </>;
}
