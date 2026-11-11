import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, setLogLevel } from 'firebase/firestore';
import { registerPatient } from '../src/lib/patient-registration.ts';
import { createPatientProfile, registrationPrefix } from '../src/lib/patient-profile.ts';
import { deletePatient } from '../src/lib/patient-deletion.ts';

setLogLevel('silent');

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
    await setDoc(doc(db,'patients/PAT-A/monitoring/latest'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'patients/PAT-A/readings/one'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'patients/PAT-A/transcripts/one'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'dashboard_access/viewer@example.com'),{enabled:true});
    await setDoc(doc(db,'dashboard_access/disabled@example.com'),{enabled:false});
  });
});
const viewer=(email,claims={})=>environment.authenticatedContext(email,{email,email_verified:true,...claims}).firestore();
test('anonymous visitors can list patients and read profiles and records',async()=>{
  const db=environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(collection(db,'patients')));
  for(const record of ['patients/PAT-A','patients/PAT-A/monitoring/latest','patients/PAT-A/readings/one','patients/PAT-A/transcripts/one'])
    await assertSucceeds(getDoc(doc(db,record)));
});
test('anonymous visitors can query patient histories and transcripts',async()=>{
  const db=environment.unauthenticatedContext().firestore();
  for(const records of ['patients/PAT-A/monitoring','patients/PAT-A/readings','patients/PAT-A/transcripts'])
    await assertSucceeds(getDocs(collection(db,records)));
});
test('public viewing does not depend on verification, claims or an access entry',async()=>{
  for(const db of [viewer('viewer@example.com',{email_verified:false}),viewer('unlisted@example.com'),viewer('disabled@example.com')])
    await assertSucceeds(getDoc(doc(db,'patients/PAT-A')));
});
test('clients cannot create malformed profiles or modify existing records',async()=>{
  for(const db of [environment.unauthenticatedContext().firestore(),viewer('viewer@example.com'),viewer('admin@example.com',{admin:true})]) {
    await assertFails(setDoc(doc(db,'patients/PAT-B'),{name:'Write attempt'}));
    for(const record of ['patients/PAT-A','patients/PAT-A/monitoring/latest','patients/PAT-A/readings/one','patients/PAT-A/transcripts/one','dashboard_access/viewer@example.com']) {
      await assertFails(setDoc(doc(db,record),{enabled:true}));
      await assertFails(updateDoc(doc(db,record),{enabled:true}));
      if(record.startsWith('dashboard_access/')) await assertFails(deleteDoc(doc(db,record)));
    }
  }
});
test('anonymous registration atomically saves a sender-compatible profile and counter',async()=>{
  const db=environment.unauthenticatedContext().firestore(), now=new Date('2026-11-11T18:30:00Z');
  const patient=await registerPatient({name:'New patient',age:0,sex:'Prefer not to say'},db,now);
  if(patient.patient_id!=='IMM-20261112-57454201-00001') throw new Error('Unexpected patient code');
  const saved=await getDoc(doc(db,'patients',patient.patient_id));
  if(saved.data().patient_code!==patient.patient_id || saved.data().name!=='New patient') throw new Error('Profile was not saved');
  const counter=await getDoc(doc(db,'registration_counters',registrationPrefix(now)));
  if(counter.data().value!==1) throw new Error('Counter was not saved');
  await assertFails(updateDoc(saved.ref,{name:'Altered patient'}));
  await assertSucceeds(deleteDoc(saved.ref));
});
test('simultaneous registrations allocate distinct persistent daily sequences',async()=>{
  const db=environment.unauthenticatedContext().firestore(), now=new Date('2026-11-11T18:30:00Z');
  const patients=await Promise.all(Array.from({length:3},()=>registerPatient({name:'Duplicate name',age:30,sex:'Male'},db,now)));
  if(new Set(patients.map(patient=>patient.patient_id)).size!==3) throw new Error('Patient IDs collided');
  const next=await registerPatient({name:'Next patient',age:30,sex:'Male'},db,now);
  if(!next.patient_id.endsWith('-00004')) throw new Error('Counter did not persist');
});
test('profile and counter writes cannot be separated or forge measurements',async()=>{
  const db=environment.unauthenticatedContext().firestore(), now=new Date('2026-11-11T18:30:00Z');
  const profile=createPatientProfile({name:'Patient',age:30,sex:'Male'},1,now);
  await assertFails(setDoc(doc(db,'patients',profile.patient_id),profile));
  await assertFails(setDoc(doc(db,'registration_counters',registrationPrefix(now)),{value:1,patient_id:profile.patient_id}));
  await assertFails(setDoc(doc(db,'patients',profile.patient_id),{...profile,sensors:{}}));
  try { await registerPatient({name:'',age:30,sex:'Male'},db,now); throw new Error('Invalid form succeeded'); }
  catch(error) { if(!error.message.includes('patient name')) throw error; }
  if((await getDoc(doc(db,'registration_counters',registrationPrefix(now)))).exists()) throw new Error('Invalid form consumed an ID');
});
test('access entries and unrelated collections remain inaccessible',async()=>{
  for(const db of [environment.unauthenticatedContext().firestore(),viewer('admin@example.com',{admin:true})]) {
    await assertFails(getDoc(doc(db,'dashboard_access/viewer@example.com')));
    await assertFails(getDocs(collection(db,'dashboard_access')));
    await assertFails(getDocs(collection(db,'other')));
    await assertFails(setDoc(doc(db,'other/one'),{value:true}));
  }
});
test('patient deletion clears every gateway record collection and preserves other patients',async()=>{
  await environment.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();
    await setDoc(doc(db,'patients/PAT-A/sessions/one'),{patient_id:'PAT-A'});
    await setDoc(doc(db,'patients/PAT-B'),{name:'Keep this patient'});
    await setDoc(doc(db,'patients/PAT-B/readings/one'),{patient_id:'PAT-B'});
  });
  const db=environment.unauthenticatedContext().firestore();
  await deletePatient('PAT-A',db);
  if((await getDoc(doc(db,'patients/PAT-A'))).exists()) throw new Error('Patient profile remains');
  for(const records of ['monitoring','readings','sessions','transcripts'])
    if(!(await getDocs(collection(db,'patients/PAT-A',records))).empty) throw new Error('Patient records remain');
  if(!(await getDoc(doc(db,'patients/PAT-B/readings/one'))).exists()) throw new Error('Another patient was altered');
});
