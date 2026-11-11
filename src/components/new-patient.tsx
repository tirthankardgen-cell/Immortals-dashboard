'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, UserRoundPlus } from 'lucide-react';
import { PATIENT_SEXES, validatePatientInput } from '@/lib/patient-profile';
import { registerPatient } from '@/lib/patient-registration';
import { useWorkspace } from './workspace-provider';

export function NewPatient() {
  const router = useRouter(), { preview, href, online } = useWorkspace();
  const [name, setName] = useState(''), [age, setAge] = useState(''), [sex, setSex] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (preview || busy) return;
    setError('');
    try {
      const input = validatePatientInput({ name, age: age.trim() ? Number(age) : Number.NaN, sex });
      if (!online) throw new Error('Connect to the internet to register this patient.');
      setBusy(true);
      const patient = await registerPatient(input);
      router.push(`/patients/${encodeURIComponent(patient.patient_id)}`);
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      setError(code.includes('permission-denied') ? 'Patient registration is awaiting workspace setup. Please try again shortly.'
        : code.includes('unavailable') || code.includes('deadline') ? 'We could not save this patient. Check your connection and try again.'
        : cause instanceof Error && !code ? cause.message : 'We could not register this patient. Please try again.');
    } finally { setBusy(false); }
  };
  return <>
    <Link className="inline-flex items-center gap-2 text-[10px] muted" href={href('/')}><ArrowLeft size={13}/>Back to patients</Link>
    <section className="registration-card">
      <div className="registration-icon"><UserRoundPlus size={25}/></div>
      <div className="eyebrow mint mt-6">PATIENT REGISTRATION</div>
      <h1>Add a new patient<span className="mint">.</span></h1>
      <p>Enter their details to create a patient record. A unique patient ID is assigned when you save.</p>
      {preview && <div className="form-error" role="status">Preview records are fictional. <Link className="mint" href="/patients/new">Open live registration</Link> to save a new patient.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={event => void submit(event)}>
        <fieldset disabled={busy || preview} className="border-0 p-0 m-0 min-w-0">
          <div className="field"><label htmlFor="patient-name">Patient name</label><input id="patient-name" required maxLength={80} autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Full name"/></div>
          <div className="registration-fields">
            <div className="field"><label htmlFor="patient-age">Age (years)</label><input id="patient-age" required type="number" min={0} max={130} step={1} inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} placeholder="0–130"/></div>
            <div className="field"><label htmlFor="patient-sex">Sex</label><select id="patient-sex" required value={sex} onChange={event => setSex(event.target.value)}><option value="" disabled>Select an option</option>{PATIENT_SEXES.map(value => <option key={value}>{value}</option>)}</select></div>
          </div>
          <div className="registration-note">Vitals will appear in this record after the sender and gateway save measurements for this patient.</div>
          <button className="button primary w-full mt-6" type="submit">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <UserRoundPlus size={15}/>} {busy ? 'Creating patient…' : 'Create patient'}</button>
        </fieldset>
      </form>
    </section>
  </>;
}
