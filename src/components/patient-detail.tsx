'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AudioLines, Clock3, Cpu, Download, Droplets, FileText, Gauge, HeartPulse, Info, Thermometer, Waves, Wind } from 'lucide-react';
import { useHistory, useLatest, usePatient, useTranscripts, type DataState } from '@/lib/use-patients';
import { displayNumber, formatTime, initials, metric, monitoringState, sensorFresh, waveformPath, type Patient, type Reading, type Transcript, type Waveform } from '@/lib/model';
import { useWorkspace } from './workspace-provider';
import { DataMessage, LoadingPanel, StatusPill } from './ui';
import { DeletePatientButton } from './delete-patient';

function WaveCard({ kind, wave, show, status, preview }: { kind: 'pulse' | 'ecg'; wave: Waveform | undefined; show: boolean; status: string; preview: boolean }) {
  const color = kind === 'pulse' ? '#54e3b0' : '#61baff', path = show ? waveformPath(wave, kind) : '';
  return <article className="wave-card"><div className="wave-head" style={{ color }}><span className="flex items-center gap-2"><Waves size={14}/>{kind === 'pulse' ? 'Pulse waveform' : 'ECG waveform'}</span><small>{preview ? 'Sample trace' : '8-second window'}</small></div>
    <div className="wave-plot">{path ? <svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label={`${preview ? 'Sample' : 'Received'} ${kind} waveform`}><path d={path} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg>
      : <div className="wave-empty">No current waveform<br/>Fresh samples will appear here.</div>}</div>
    <div className="wave-caption"><span className="wave-status">{preview ? 'Fictional waveform for interface preview.' : status}</span><span className="wave-unit">{kind === 'ecg' ? 'Filtered signal · mV at ADC · gaps remain visible' : 'Relative pulse amplitude · MAX30102'}</span></div>
  </article>;
}
function RecordHistory({ state }: { state: DataState<Reading[]> }) {
  const { preview, now } = useWorkspace();
  if (state.status === 'loading') return <LoadingPanel label="Loading measurement history"/>;
  if (state.status === 'error') return <DataMessage error={state.error}/>;
  return <><div className="section-heading">Record history<span className="text-[9px] muted font-normal">{preview ? 'Sample records' : 'Latest 50 saved readings'}</span></div>
    {state.data.length === 0 ? <div className="panel empty"><div className="empty-symbol"><Clock3 size={24}/></div><h2>No recorded measurements yet</h2><p>Timestamped readings will appear here as they are saved for this patient.</p></div>
      : <div className="panel table-scroll"><table className="record-table"><thead><tr><th>Recorded at · IST</th><th>Heart rate</th><th>SpO2</th><th>Body surface</th><th>ECG rate</th></tr></thead><tbody>{state.data.map(reading => <tr key={reading.id}>
        <td>{formatTime(reading.capturedAt, true)}</td><td>{displayNumber(metric(reading, 'pulse', 'heart_rate_bpm', now, true), 0)} bpm</td>
        <td>{displayNumber(metric(reading, 'pulse', 'spo2_percent', now, true))}%</td><td>{displayNumber(metric(reading, 'mlx', 'object_c', now, true))} °C</td>
        <td>{displayNumber(metric(reading, 'ecg', 'heart_rate_bpm', now, true), 0)} bpm</td></tr>)}</tbody></table></div>}
    <p className="text-[10px] muted mt-5 leading-7">These are saved measurements at their original capture times. They are separate from current monitoring.</p></>;
}
function Transcripts({ state }: { state: DataState<Transcript[]> }) {
  const { preview } = useWorkspace();
  if (state.status === 'loading') return <LoadingPanel label="Loading patient transcripts"/>;
  if (state.status === 'error') return <DataMessage error={state.error}/>;
  return <><div className="section-heading">Patient conversations<span className="text-[9px] muted font-normal">Speaker-labelled transcripts</span></div>
    {state.data.length === 0 ? <div className="panel empty"><div className="empty-symbol"><AudioLines size={25}/></div><h2>No conversations recorded yet</h2><p>Speaker-labelled transcripts will appear here when speech recording is enabled for this patient.</p></div>
      : state.data.map(transcript => <article className="transcript-card" key={transcript.id}><div className="transcript-heading"><div className="flex items-center gap-2"><FileText size={15} className="sky"/>{formatTime(transcript.startedAt, true)}</div><StatusPill status={preview ? 'sample' : 'Saved transcript'}/></div>
        {transcript.segments.map((segment, i) => <div className="speech" key={`${transcript.id}-${i}`}><div className="speech-speaker" style={{ color: i%2 ? 'var(--green)' : 'var(--blue)' }}>{segment.speakerId}<small>{`${Math.floor(segment.startMs/60000)}:${String(Math.floor(segment.startMs/1000)%60).padStart(2, '0')}`}</small></div><p className="speech-text">{segment.text}</p></div>)}
        <div className="text-[9px] muted border-t border-white/5 pt-4 mt-5">{transcript.language ?? 'Language not recorded'} · {preview ? 'Fictional conversation for preview' : 'Speaker labels describe this monitoring session'}</div>
      </article>)}</>;
}
function Profile({ patient, reading }: { patient: Patient; reading: Reading | null }) {
  return <section className="panel profile-panel" aria-label="Additional patient information"><div className="flex items-center gap-2 px-5 pt-5 text-[11px] font-semibold"><FileText size={14} className="muted"/>Patient information</div>
    <dl className="profile-grid">{[['Ward / bed', patient.ward ? `${patient.ward} / ${patient.bed ?? '—'}` : 'Not entered'], ['Assigned clinician', patient.clinician ?? 'Not entered'],
      ['Contact', patient.contact ?? 'Not entered'], ['Device', reading?.deviceId ?? patient.deviceId ?? 'Not assigned']].map(([label, value]) => <div className="profile-field" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {patient.notes && <div className="profile-notes">{patient.notes}</div>}</section>;
}
export function PatientDetail({ patientId }: { patientId: string }) {
  const profile = usePatient(patientId), latest = useLatest(patientId), history = useHistory(patientId), transcripts = useTranscripts(patientId);
  const { preview, now, href } = useWorkspace(), params = useSearchParams(), router = useRouter();
  const sections = ['overview', 'information', 'history', 'transcripts'];
  const requested = params.get('section') ?? 'overview', tab = sections.includes(requested) ? requested : 'overview';
  const setTab = (key: string) => router.replace(href(`/patients/${encodeURIComponent(patientId)}?section=${key}`), { scroll: false });
  if (profile.status === 'loading') return <LoadingPanel label="Opening patient record"/>;
  if (profile.status === 'error') return <DataMessage error={profile.error}/>;
  if (!profile.data) return <DataMessage missing/>;
  const patient = profile.data, reading = latest.data;
  const state = preview ? (reading ? 'sample' : 'waiting') : latest.status === 'loading' ? 'unknown' : monitoringState(reading, now);
  const recorded = reading?.recordingMode === 'submitted_snapshot';
  const value = (sensor: Parameters<typeof metric>[1], field: string) => metric(reading, sensor, field, now, preview || recorded);
  const ecgRate = value('ecg', 'heart_rate_bpm'), ecgCandidate = value('ecg', 'candidate_bpm');
  const provisional = ecgRate === null && ecgCandidate !== null;
  const showWave = preview || recorded || state === 'monitoring';
  const exportRecord = () => {
    const payload = { source: preview ? 'fictional-preview' : 'firebase', patient, latest: reading,
      history: history.data, transcripts: transcripts.data };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `immortals-${patient.id}.json`; link.click(); URL.revokeObjectURL(url);
  };
  return <>
    <Link href={href('/')} className="patient-back inline-flex items-center gap-2 text-[10px] muted mb-5"><ArrowLeft size={13}/>Back to patient directory</Link>
    <header className="patient-banner"><div className="flex items-center gap-4 min-w-0"><div className="avatar">{initials(patient.name)}</div><div>
      <div className="eyebrow" style={{ fontSize: 8 }}>PATIENT INFORMATION</div><h1>{patient.name}</h1><div className="patient-meta"><span className="id-tag mono">{patient.displayId ?? patient.id}</span><span>{patient.age ?? '—'} years</span><span>{patient.sex}</span>{patient.ward && <span>Ward {patient.ward} · Bed {patient.bed ?? '—'}</span>}</div>
    </div></div><div className="patient-banner-right text-right"><StatusPill status={state}/><div className="text-[9px] muted mt-3" title={recorded ? 'These saved vitals and waveforms describe this recording.' : undefined}>{preview ? 'Sample capture' : recorded ? 'Recorded capture' : 'Last recorded'} · {formatTime(reading?.capturedAt ?? null, recorded)}</div></div></header>
    <div className="patient-tabs-row"><div className="tabs" role="tablist" aria-label="Patient record sections">
      {[['overview', 'Overview'], ['information', 'Information'], ['history', 'Record history'], ['transcripts', 'Transcripts']].map(([key, label]) => <button className={`tab ${tab === key ? 'active' : ''}`} key={key} role="tab" tabIndex={tab === key ? 0 : -1} aria-selected={tab === key} aria-controls={`panel-${key}`} id={`tab-${key}`} onClick={() => setTab(key)} onKeyDown={event => {
        const keys = sections;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); const next = keys[(keys.indexOf(key)+(event.key === 'ArrowRight' ? 1 : keys.length-1))%keys.length];
          setTab(next); requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
        }
      }}>{label}</button>)}
    </div><div className="patient-tools flex items-center gap-2"><button className="icon-button" aria-label="Export patient record as JSON" onClick={exportRecord}><Download size={16}/></button><DeletePatientButton patient={patient}/></div></div>
    <section className={`patient-content ${tab === 'overview' ? 'overview-content' : ''}`} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'information' ? <Profile patient={patient} reading={reading}/> : tab === 'history' ? <RecordHistory state={history}/> : tab === 'transcripts' ? <Transcripts state={transcripts}/>
        : <>{latest.status === 'error' && <div className="note-bar" role="status"><Info size={14}/>{latest.error?.message}</div>}
          {!preview && !recorded && state === 'stale' && <div className="note-bar" role="status"><Clock3 size={14}/>Monitoring is paused. Current values are cleared; previous measurements are available in Record history.</div>}
          <div className="detail-grid"><div className="vitals-area"><h2 className="section-heading">Patient vitals<span className="text-[8px] muted font-normal">{preview ? 'Sample measurements' : recorded ? 'Last recorded capture' : 'Latest source measurements'}</span></h2>
            <div className="vital-grid">{[
              { label: 'Heart rate', number: value('pulse', 'heart_rate_bpm'), unit: 'bpm', decimals: 0, color: 'var(--green)', icon: HeartPulse, source: 'MAX30102 · optical pulse' },
              { label: 'Blood oxygen', number: value('pulse', 'spo2_percent'), unit: '%', decimals: 1, color: 'var(--blue)', icon: Droplets, source: 'SpO2 · saturation estimate' },
              { label: 'Body temperature', number: value('mlx', 'object_c'), unit: '°C', decimals: 1, color: 'var(--gold)', icon: Thermometer, source: 'MLX90614 · infrared surface' },
              { label: 'ECG heart rate', number: ecgRate ?? ecgCandidate, unit: 'bpm', decimals: 0, color: 'var(--blue)', icon: ActivityIcon, source: 'ECG · separate from optical rate', note: provisional ? 'UNRELIABLE · provisional peak rate' : null },
            ].map(item => <article className="vital" key={item.label}><div className="vital-top"><span>{item.label}</span><item.icon size={14} style={{ color: item.color }}/></div><div className="vital-value" style={{ color: item.color }}>{item.note ? '~' : ''}{displayNumber(item.number, item.decimals)}<small>{item.unit}</small></div><div className="vital-source">{item.source}</div>{item.note && <div className="vital-note">{item.note}</div>}</article>)}</div>
            <div className="wave-grid"><WaveCard kind="pulse" wave={reading?.waveforms.pulse} show={showWave && (preview || recorded || sensorFresh(reading, 'pulse', now))} status={reading?.sensors.pulse?.status ?? 'Waiting for sensor'} preview={preview}/>
              <WaveCard kind="ecg" wave={reading?.waveforms.ecg} show={showWave && (preview || recorded || sensorFresh(reading, 'ecg', now))} status={`${provisional ? 'UNRELIABLE · ' : ''}${reading?.sensors.ecg?.status ?? 'Waiting for sensor'}`} preview={preview}/></div>
          </div><aside className="environment-rail" aria-label="Environmental data"><h2 className="section-heading muted" style={{ fontSize: 11 }}>Environmental data</h2>
            {[
              { label: 'Room temperature', number: value('dht', 'temperature_c'), unit: '°C', source: 'DHT22', icon: Wind, color: 'var(--green)' },
              { label: 'Relative humidity', number: value('dht', 'humidity_percent'), unit: '% RH', source: 'DHT22', icon: Droplets, color: 'var(--blue)' },
              { label: 'Air pressure', number: value('bmp', 'pressure_hpa'), unit: 'hPa', source: 'BMP180', icon: Gauge, color: 'var(--gold)' },
              { label: 'Board temperature', number: value('bmp', 'temperature_c'), unit: '°C', source: 'BMP180', icon: Cpu, color: 'var(--ink)' },
            ].map(item => <article className="environment-card" key={item.label}><div className="environment-label"><span>{item.label}</span><item.icon size={12}/></div><div className="environment-value" style={{ color: item.color }}>{displayNumber(item.number)}<small>{item.unit}</small></div><div className="environment-source">{item.source}</div></article>)}
          </aside></div>
          <p className="measurement-note text-[9px] muted mt-5 leading-6">SpO2 is an estimated value. Body temperature reflects the measured surface. Provisional ECG rates are marked unreliable.</p>
        </>}
    </section>
  </>;
}
function ActivityIcon(props: { size?: number; style?: React.CSSProperties }) { return <AudioLines {...props}/>; }
