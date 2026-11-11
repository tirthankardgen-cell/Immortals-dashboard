import { SignIn } from '@/components/sign-in';
import { pageMetadata } from '@/lib/site-metadata';
export const metadata = pageMetadata('Sign in', 'Optional account sign-in for the Immortals patient monitoring workspace.', '/login');
export default function LoginPage() { return <SignIn/>; }
