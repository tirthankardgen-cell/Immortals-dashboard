'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <div className="empty"><h2>We couldn’t open this record.</h2><p>Please try again. Your saved patient data has not been changed.</p><button onClick={reset} className="button primary">Try again</button></div>;
}
