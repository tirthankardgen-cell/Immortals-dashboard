'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, AudioLines, ChevronRight, CircleHelp, Clock3, Cloud, FileText, LogOut, Menu, UserRoundPlus, UsersRound, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';
import { useWorkspace } from './workspace-provider';

export function AppShell({ children }: { children: ReactNode }) {
  const { preview, user, online, href } = useWorkspace();
  const path = usePathname(), router = useRouter();
  const params = useSearchParams(), patientPage = path.startsWith('/patients/') && path !== '/patients/new';
  const pageClass = path === '/' ? 'directory-page' : path === '/patients/new' ? 'registration-page' : patientPage ? 'patient-page' : 'other-page';
  const [menu, setMenu] = useState(false), [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {menu && <button className="scrim" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <aside className={`sidebar ${menu ? 'open' : ''}`} aria-label="Main navigation">
      <Link href={href('/')} className="brand" onClick={() => setMenu(false)} aria-label="Immortals patient directory">
        <div className="brand-mark"><Activity size={29} strokeWidth={1.7}/></div>
        <div><div className="brand-word">IMMORTALS</div><div className="brand-sub">PATIENT MONITORING</div></div>
      </Link>
      <nav className="sidebar-nav"><div className="nav-label">WORKSPACE</div>
        <Link href={href('/')} className={`nav-item ${path === '/' ? 'active' : ''}`} onClick={() => setMenu(false)}>
          <UsersRound size={17}/><span>Patient directory</span><ChevronRight size={13} className="ml-auto"/>
        </Link>
        <Link href={href('/patients/new')} className={`nav-item ${path === '/patients/new' ? 'active' : ''}`} onClick={() => setMenu(false)}><UserRoundPlus size={17}/><span>New patient</span></Link>
        {patientPage && <><div className="nav-label patient-nav-label">CURRENT PATIENT</div>{[
          { key: 'overview', label: 'Vitals', icon: Activity }, { key: 'information', label: 'Patient information', icon: FileText },
          { key: 'history', label: 'Record history', icon: Clock3 }, { key: 'transcripts', label: 'Transcripts', icon: AudioLines },
        ].map(item => <Link key={item.key} href={href(`${path}?section=${item.key}`)} className={`nav-item ${(params.get('section') ?? 'overview') === item.key ? 'active' : ''}`} onClick={() => setMenu(false)}><item.icon size={17}/><span>{item.label}</span></Link>)}</>}
      </nav>
      <div className="side-bottom">
        <button className="nav-item" onClick={() => { setHelp(true); setMenu(false); }}><CircleHelp size={17}/>About monitoring</button>
        <div className="side-note"><div className="flex items-center gap-2 text-[10px]"><Cloud size={14} className="mint"/>One connected workspace</div>
          <p>Patient profiles, sensor readings, and conversations in one place.</p></div>
        <div className="eyebrow mt-6 px-2" style={{ fontSize: 8 }}>IMMORTALS · CARE PLATFORM</div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="flex items-center gap-3"><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu size={18}/></button>
          <div className="breadcrumbs"><span className="workspace-crumb">Workspace</span><ChevronRight size={12} className="workspace-crumb"/>
            <Link href={href('/')}>Patients</Link>{path.startsWith('/patients/') && <><ChevronRight size={12}/><strong>{path === '/patients/new' ? 'New patient' : 'Patient record'}</strong></>}
          </div>
        </div>
        <div className="top-actions">
          <span className="hide-small flex items-center gap-2 text-[10px] muted"><span className="connection-dot" style={{ background: preview ? '#61baff' : online ? '#54e3b0' : '#ffcb78' }}/>{preview ? 'Preview workspace' : online ? 'Cloud workspace' : 'Offline'}</span>
          <Link className="button ghost" href={preview ? path : `${path}?view=preview`}>{preview ? 'Live records' : 'Preview'}<ArrowUpRight size={12}/></Link>
          {user ? <button className="icon-button" aria-label="Sign out" onClick={async () => { await signOut(getFirebase().auth); router.push('/'); }}><LogOut size={15}/></button>
            : <Link className="button" href="/login">Sign in</Link>}
        </div>
      </header>
      {preview && <div className="preview-notice" role="status"><span className="status-pill sample">Preview</span>
        Fictional patient records and sample measurements. This workspace is separate from live data.</div>}
      <main className="page" id="main-content"><div className={`page-content ${pageClass}`}>{children}</div><footer className="workspace-footer">
        <span>Immortals patient monitoring</span><span>{preview ? 'Sample data · Interface preview' : 'Zigbee gateway → cloud records → your workspace'}</span>
      </footer></main>
    </div>
    <dialog ref={dialog} className="modal" onCancel={() => setHelp(false)} onClick={event => { if (event.target === dialog.current) setHelp(false); }}
      style={{ color: 'var(--ink)' }} aria-labelledby="guide-title">
      <div className="flex justify-between items-center"><Activity className="mint" size={24}/><button className="icon-button" aria-label="Close guide" onClick={() => setHelp(false)}><X size={17}/></button></div>
      <h2 id="guide-title">A clear view of each patient.</h2><p>Select a patient to see their profile, vitals, environmental readings, history, and available speaker-labelled transcripts.</p>
      <p>Body temperature is the infrared surface measurement. Signal quality and timestamps help you understand whether a reading is current. Older readings are available in Record history.</p>
      <p>Preview records are fictional. Live records come from your receiving gateway’s cloud database.</p>
      <button className="button primary mt-3" onClick={() => setHelp(false)}>Got it</button>
    </dialog>
  </>;
}
