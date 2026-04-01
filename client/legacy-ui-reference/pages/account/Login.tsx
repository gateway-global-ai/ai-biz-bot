/**
 * Unified Login — phone → OTP → matched accounts (full-page route `/login`)
 */
import { UnifiedOtpForm } from '@gateway/canvas-sdk';

export default function Login() {
  return <UnifiedOtpForm surface="fullPage" />;
}
