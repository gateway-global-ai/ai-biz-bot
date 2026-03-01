import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function ResellerApplyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Apply to be a Reseller</h1>
      <p className="text-slate-600 mb-6 max-w-md">
        Partner with Gateway Global to offer AI-powered business tools to your clients. Apply for reseller access.
      </p>
      <Link href="/business">
        <Button variant="outline" className="border-slate-200 text-slate-700">
          ← Back to Business
        </Button>
      </Link>
    </div>
  );
}
