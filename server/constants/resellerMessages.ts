/**
 * Digital Franchise / Reseller onboarding messages.
 * Used when a partner pays $49 and joins the network (e.g. after Stripe webhook or signup).
 */

/** Placeholder for partner's unique referral link; replace at send time. */
export const RESELLER_WELCOME_SMS =
  "🚀 Mission Started: Welcome to the inner circle. Your unique referral link is live. I'm standing by to start building your first site. Let's scale.";

/**
 * Build the welcome SMS with optional referral link.
 * Call after successful $49 signup; pass the partner's referral URL when available.
 */
export function getResellerWelcomeSms(referralLink?: string): string {
  if (referralLink) {
    return `${RESELLER_WELCOME_SMS} ${referralLink}`;
  }
  return RESELLER_WELCOME_SMS;
}
