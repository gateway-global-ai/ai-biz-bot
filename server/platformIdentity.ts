/**
 * platformIdentity.ts
 *
 * Thin re-export shim.  All platform identity logic lives in server/storage.ts
 * (the single System of Record).  Import directly from storage where possible;
 * this module is kept for backwards-compatibility with any existing call sites.
 */
export { storage as platformIdentityStorage } from "./storage";

// Named re-exports for ergonomic use at call sites that import by function name.
import { storage } from "./storage";

/** @see storage.getOrCreatePlatformId */
export const getOrCreatePlatformId = (siteConfigId: string) =>
  storage.getOrCreatePlatformId(siteConfigId);

/** @see storage.resolvePlatformId */
export const resolvePlatformId = (
  input: Parameters<typeof storage.resolvePlatformId>[0],
) => storage.resolvePlatformId(input);
