import { Redirect } from 'wouter';
import { getPublicDemoSlug } from '@/lib/conciergeBusinessContext';

/**
 * Short public URL: /demo → /biz/:slug (canonical marketing demo on public business chrome).
 */
export default function DemoPublicRedirect() {
  return <Redirect to={`/biz/${encodeURIComponent(getPublicDemoSlug())}`} />;
}
