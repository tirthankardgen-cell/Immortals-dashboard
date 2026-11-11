import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({projectId:'demo-immortals', firestore:{host:'127.0.0.1',port:8085,rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
});
after(async () => { await environment?.cleanup(); });
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await setDoc(doc(db,'patients/PAT-A'),{patient_id:'PAT-A',name:'Rule test'});
    await setDoc(doc(db,'patients/PAT-A/readings/one'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'patients/PAT-A/transcripts/one'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'dashboard_access/viewer@example.com'),{enabled:true});
    await setDoc(doc(db,'dashboard_access/disabled@example.com'),{enabled:false});
  });
});
const viewer=(email,claims={})=>environment.authenticatedContext(email,{email,email_verified:true,...claims}).firestore();
test('anonymous visitors cannot read patient profiles or list patients',async()=>{
  const db=environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db,'patients/PAT-A')));
  await assertFails(getDocs(collection(db,'patients')));
});
test('verified enabled viewers can list patients and read their records',async()=>{
  const db=viewer('viewer@example.com');
  await assertSucceeds(getDocs(collection(db,'patients')));
  for(const record of ['patients/PAT-A','patients/PAT-A/monitoring/latest','patients/PAT-A/readings/one','patients/PAT-A/transcripts/one'])
    await assertSucceeds(getDoc(doc(db,record)));
});
test('unverified, unlisted and disabled users cannot read patients',async()=>{
  for(const db of [viewer('viewer@example.com',{email_verified:false}),viewer('unlisted@example.com'),viewer('disabled@example.com')])
    await assertFails(getDoc(doc(db,'patients/PAT-A')));
});
test('admin and viewer claims authorize reads only for verified accounts',async()=>{
  for(const claim of ['admin','immortals_viewer']){
    await assertSucceeds(getDoc(doc(viewer('claimed@example.com',{[claim]:true}),'patients/PAT-A')));
    await assertFails(getDoc(doc(viewer('claimed@example.com',{[claim]:true,email_verified:false}),'patients/PAT-A')));
  }
});
test('browser clients cannot alter profiles, readings or their access entries',async()=>{
  for(const db of [viewer('viewer@example.com'),viewer('admin@example.com',{admin:true})]) {
    for(const record of ['patients/PAT-A','patients/PAT-A/readings/one','dashboard_access/viewer@example.com'])
      await assertFails(setDoc(doc(db,record),{enabled:true}));
    await assertFails(getDoc(doc(db,'dashboard_access/viewer@example.com')));
  }
});
test('unrelated collections remain inaccessible',async()=>{
  const db=viewer('admin@example.com',{admin:true});
  await assertFails(getDocs(collection(db,'other')));
  await assertFails(setDoc(doc(db,'other/one'),{value:true}));
});
