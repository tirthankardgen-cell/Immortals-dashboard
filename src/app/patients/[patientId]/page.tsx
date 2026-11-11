import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PatientDetail } from '@/components/patient-detail';
export const metadata: Metadata = { title: 'Patient record' };
export default async function PatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  if (!patientId || patientId.includes('/') || /[\x00-\x1f]/.test(patientId) || patientId.length > 256) notFound();
  return <PatientDetail patientId={patientId}/>;
}
