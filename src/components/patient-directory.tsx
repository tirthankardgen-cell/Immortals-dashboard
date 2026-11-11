'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Cloud, HeartPulse, LayoutGrid, List, RefreshCw, Search, UserRoundPlus, UsersRound, X } from 'lucide-react';
import { usePatients, useDirectoryReadings } from '@/lib/use-patients';
import { formatTime, initials, monitoringState } from '@/lib/model';
import { useWorkspace } from './workspace-provider';
import { DataMessage, LoadingPanel, StatusPill } from './ui';

export function PatientDirectory() {
  const source = usePatients();
  const { preview, now, refresh, href, online } = useWorkspace();
  const [search, setSearch] = useState(''), [sex, setSex] = useState('all');
  const [sort, setSort] = useState('name'), [page, setPage] = useState(0), [grid, setGrid] = useState(false);
  const panel = useRef<HTMLElement>(null), [pageSize, setPageSize] = useState(6);
  useEffect(() => {
    const update = () => {
      if (!panel.current) return;
      if (!window.matchMedia('(min-width: 801px) and (min-height: 520px)').matches) { setPageSize(6); return; }
      const toolbarHeight = panel.current.querySelector('.panel-toolbar')?.getBoundingClientRect().height ?? 58;
      const available = panel.current.clientHeight - toolbarHeight - 42 - (grid ? 24 : 30) - 2;
      const columns = window.innerWidth <= 1050 ? 2 : 3;
      setPageSize(grid ? Math.max(columns, Math.min(12, Math.floor(available / 192) * columns))
        : Math.max(1, Math.min(8, Math.floor(available / 52))));
    };
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', update); update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [grid]);
  const filtered = source.data.filter(patient => `${patient.name} ${patient.id} ${patient.displayId ?? ''}`.toLowerCase().includes(search.toLowerCase().trim())
    && (sex === 'all' || patient.sex.toLowerCase() === sex))
    .sort((a, b) => sort === 'newest' ? (b.registeredAt ?? 0)-(a.registeredAt ?? 0) : a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
  const safePage = Math.min(page, pages-1), visible = filtered.slice(safePage*pageSize, (safePage+1)*pageSize);
  const readings = useDirectoryReadings(visible.map(patient => patient.id));
  const count = source.status === 'ready' ? String(source.data.length).padStart(2, '0') : '—';
  const withReadings = Object.values(readings).filter(Boolean).length;
  const connection = preview ? 'Preview' : !online ? 'Offline' : source.status === 'error' ? 'Protected'
    : source.status === 'loading' ? 'Connecting' : source.cached ? 'Cached' : 'Connected';
  const status = (id: string) => preview ? (readings[id] ? 'sample' : 'waiting')
    : readings[id] === undefined ? 'unknown' : monitoringState(readings[id] ?? null, now);
  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR CARE WORKSPACE</div>
      <h1>Patient directory<span className="mint">.</span></h1>
      <p>A clear view of every patient and their latest measurements.</p></div>
      <div className="directory-actions"><button className="button hide-small" onClick={refresh} aria-label="Refresh patient records"><RefreshCw size={13}/>Refresh records</button>
        <Link className="button primary" href={href('/patients/new')}><UserRoundPlus size={14}/>New patient</Link></div>
    </div>
    <section className="stats" aria-label="Directory overview">
      <div className="stat"><div><div className="stat-label">Registered patients</div><div className="stat-value">{count}</div><div className="stat-note">{preview ? 'Fictional patient profiles' : 'Your patient workspace'}</div></div><div className="stat-icon"><UsersRound size={19}/></div></div>
      <div className="stat"><div><div className="stat-label">With measurements</div><div className="stat-value">{source.status === 'ready' ? String(withReadings).padStart(2, '0') : '—'}</div><div className="stat-note">In the current page</div></div><div className="stat-icon" style={{ color: 'var(--blue)', background: '#61baff0b' }}><HeartPulse size={19}/></div></div>
      <div className="stat"><div><div className="stat-label">Workspace status</div><div className="stat-value" style={{ fontSize: 23, color: preview ? 'var(--blue)' : source.status === 'ready' ? 'var(--green)' : 'var(--gold)' }}>{connection}</div><div className="stat-note">{preview ? 'Sample data, separate from live' : 'Patient record connection'}</div></div><div className="stat-icon" style={{ color: 'var(--gold)', background: '#ffcb780b' }}><Cloud size={19}/></div></div>
    </section>
    <section ref={panel} className="panel directory-panel" aria-label="Patient records">
      <div className="panel-toolbar">
        <div className="searchbox"><Search size={15}/><label className="sr-only" htmlFor="patient-search">Search patients by name or ID</label>
          <input id="patient-search" placeholder="Search by name or patient ID…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}/>
          {search && <button className="icon-button" aria-label="Clear search" onClick={() => { setSearch(''); setPage(0); }}><X size={12}/></button>}
        </div>
        <select className="select" aria-label="Filter by sex" value={sex} onChange={event => { setSex(event.target.value); setPage(0); }}><option value="all">All patients</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select>
        <select className="select" aria-label="Sort patients" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="name">Name: A–Z</option><option value="newest">Newest first</option></select>
        <div className="flex ml-auto gap-1" aria-label="Directory view"><button className={`icon-button ${!grid ? 'active' : ''}`} aria-label="List view" aria-pressed={!grid} onClick={() => setGrid(false)}><List size={17}/></button>
          <button className={`icon-button ${grid ? 'active' : ''}`} aria-label="Grid view" aria-pressed={grid} onClick={() => setGrid(true)}><LayoutGrid size={15}/></button></div>
      </div>
      {source.status === 'loading' ? <LoadingPanel/> : source.status === 'error' ? <DataMessage error={source.error}/>
        : source.data.length === 0 ? <DataMessage empty/>
        : filtered.length === 0 ? <div className="empty"><div className="empty-symbol"><Search size={24}/></div><h2>No matching patients</h2><p>Try a different name, patient ID, or filter.</p><button className="button" onClick={() => { setSearch(''); setSex('all'); setPage(0); }}>Clear filters</button></div>
        : grid ? <div className="patient-grid">{visible.map((patient, i) => <Link className="patient-tile" key={patient.id} href={href(`/patients/${encodeURIComponent(patient.id)}`)} aria-label={`Open ${patient.name}, ${patient.id}`}>
          <div className="flex justify-between"><div className={`avatar tone-${i%3}`}>{initials(patient.name)}</div><ArrowUpRight size={15} className="muted"/></div>
          <div className="tile-name">{patient.name}</div><span className="id-tag mono">{patient.displayId ?? patient.id}</span>
          <div className="name-sub mt-3">{patient.age ?? '—'} years · {patient.sex}</div><div className="tile-footer"><StatusPill status={status(patient.id)}/><span className="text-[9px] muted">View record</span></div>
        </Link>)}</div>
        : <><div className="table-head" aria-hidden="true"><span>Patient</span><span className="col-id">Patient ID</span><span className="col-age">Age / sex</span><span className="col-time">Last recorded</span><span>Status</span><span/></div>
          {visible.map((patient, i) => <Link className="patient-row" key={patient.id} href={href(`/patients/${encodeURIComponent(patient.id)}`)} aria-label={`Open ${patient.name}, ${patient.id}`}>
            <div className="patient-name"><div className={`avatar tone-${i%3}`}>{initials(patient.name)}</div><div className="min-w-0"><div className="name-title">{patient.name}</div><div className="name-sub">{patient.id} · {patient.ward ? `Ward ${patient.ward}` : 'Patient record'}</div></div></div>
            <span className="id-tag mono col-id">{patient.displayId ?? patient.id}</span><div className="col-age"><div>{patient.age ?? '—'} years</div><div className="name-sub">{patient.sex}</div></div>
            <div className="col-time"><div className="text-[10px] muted">{formatTime(readings[patient.id]?.capturedAt ?? null)}</div><div className="name-sub">{preview && readings[patient.id] ? 'Sample measurement' : readings[patient.id] ? 'Capture time' : 'Awaiting readings'}</div></div>
            <StatusPill status={status(patient.id)}/><ArrowUpRight size={14} className="muted"/>
          </Link>)}</>}
      {source.status === 'ready' && filtered.length > 0 && <div className="panel-footer"><span>Showing {safePage*pageSize+1}–{Math.min((safePage+1)*pageSize, filtered.length)} of {filtered.length} patients</span>
        <div className="flex items-center gap-2"><button className="icon-button" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage-1)}><ChevronLeft size={14}/></button>
          <span>Page {safePage+1} of {pages}</span><button className="icon-button" aria-label="Next page" disabled={safePage >= pages-1} onClick={() => setPage(safePage+1)}><ChevronRight size={14}/></button></div></div>}
    </section>
    <div className="directory-hint flex items-center gap-2 text-[10px] muted mt-5"><span className="connection-dot" style={{ background: 'var(--blue)', width: 4, height: 4 }}/>
      Select a patient to explore their vitals, history, and conversations.</div>
  </>;
}
