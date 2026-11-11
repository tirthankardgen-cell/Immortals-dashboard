import Link from 'next/link';
export default function NotFound() { return <div className="empty"><h1 className="text-2xl mb-4">This page is not available.</h1><p>Return to the directory to find your patient record.</p><Link href="/" className="button primary">Patient directory</Link></div>; }
