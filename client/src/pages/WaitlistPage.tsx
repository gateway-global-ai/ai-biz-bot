import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Join the Waitlist</h1>
      <p className="text-slate-600 mb-6 max-w-md">
        Gateway Global is currently available to invited partners. Add your contact info to be notified when we open access.
      </p>
      <Link href="/business">
        <Button variant="outline" className="border-slate-200 text-slate-700">
          ← Back to Business
        </Button>
      </Link>
    </div>
  );
}
