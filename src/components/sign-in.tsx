'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react';
import { getFirebase } from '@/lib/firebase';

export function SignIn() {
  const router = useRouter(), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const authenticate = async (google: boolean) => {
    setBusy(true); setError('');
    try {
      if (google) await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
      else await signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
      router.push('/');
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      setError(code.includes('popup-closed') ? 'Sign-in was cancelled. You can try again.'
        : code.includes('operation-not-allowed') || code.includes('unauthorized-domain') ? 'Sign-in is awaiting workspace configuration. Please contact your administrator.'
        : code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') ? 'The email or password is incorrect.'
        : code.includes('too-many-requests') ? 'Please wait a moment before trying again.' : 'We could not complete sign-in. Please try again.');
    } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void authenticate(false); };
  return <><Link className="inline-flex items-center gap-2 text-[10px] muted" href="/"><ArrowLeft size={13}/>Back to patients</Link>
    <section className="login-card"><ShieldCheck size={26} className="mint"/><h1>Your care workspace.</h1><p>Account sign-in is optional. Patient records and registration are currently available without signing in.</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button w-full mb-5" disabled={busy} onClick={() => void authenticate(true)}><span className="font-bold sky">G</span>Continue with Google</button>
      <div className="text-[9px] muted text-center mb-5">or use your workspace email</div>
      <form onSubmit={submit}><div className="field"><label htmlFor="email">Email address</label><input required type="email" id="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)}/></div>
        <div className="field"><label htmlFor="password">Password</label><input required type="password" id="password" autoComplete="current-password" minLength={6} value={password} onChange={event => setPassword(event.target.value)}/></div>
        <button className="button primary w-full mt-2" disabled={busy} type="submit">{busy && <LoaderCircle size={14} className="animate-spin"/>}{busy ? 'Signing in…' : 'Sign in to workspace'}</button></form>
    </section></>;
}
