import React from "react";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

/**
 * Placeholder provider shell for the OS runtime.
 * Auth, platform, and policy providers will be layered here
 * once the governed runtime adapters are implemented.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
