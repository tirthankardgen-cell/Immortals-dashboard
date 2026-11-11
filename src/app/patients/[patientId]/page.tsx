import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PatientDetail } from '@/components/patient-detail';
import { pageMetadata } from '@/lib/site-metadata';
export async function generateMetadata({ params }: { params: Promise<{ patientId: string }> }): Promise<Metadata> {
  const { patientId } = await params;
  return pageMetadata('Patient record', 'View patient information, vitals, environmental measurements, and recorded history in the Immortals dashboard.', `/patients/${encodeURIComponent(patientId)}`);
}
export default async function PatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  if (!patientId || patientId.includes('/') || /[\x00-\x1f]/.test(patientId) || patientId.length > 256) notFound();
  return <PatientDetail patientId={patientId}/>;
}
