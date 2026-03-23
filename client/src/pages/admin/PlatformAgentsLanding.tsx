/**
 * Platform AI Biz Bot landing — redirects to /platform/businesses.
 * Kept for backward-compat with any existing links to /platform/agents.
 */
import { Redirect } from "wouter";

export function PlatformAgentsLanding() {
  return <Redirect to="/platform/businesses" />;
}
