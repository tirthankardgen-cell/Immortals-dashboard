export function GET() { return Response.json({ status: 'ok', application: 'immortals-patient-dashboard',
  node: process.versions.node, firebaseProject: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'immortals-3' },
  { headers: { 'Cache-Control': 'no-store' } }); }
