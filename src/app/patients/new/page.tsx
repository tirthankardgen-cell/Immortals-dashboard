import { NewPatient } from '@/components/new-patient';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('New patient', 'Create a patient profile for the Immortals monitoring dashboard with a unique patient ID, name, age, and sex.', '/patients/new');
export default function Page() { return <NewPatient/>; }
