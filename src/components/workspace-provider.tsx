'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { enableAnalytics, getFirebase } from '@/lib/firebase';

type Workspace = { preview: boolean; user: User | null; online: boolean; now: number;
  refreshKey: number; refresh: () => void; href: (path: string) => string };
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams(), preview = params.get('view') === 'preview';
  const [user, setUser] = useState<User | null>(null);
  const [online, setOnline] = useState(true), [now, setNow] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value+1), []);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setNow(Date.now()); };
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    const unsubscribe = onAuthStateChanged(getFirebase().auth, setUser);
    void enableAnalytics().catch(() => undefined);
    return () => { clearTimeout(initial); clearInterval(timer); unsubscribe();
      window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <Context.Provider value={{ preview, user, online, now, refreshKey, refresh,
    href: path => preview ? `${path}${path.includes('?') ? '&' : '?'}view=preview` : path }}>
    {children}
  </Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
