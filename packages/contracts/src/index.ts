/**
 * @gateway/contracts — Gateway OS runtime contracts.
 *
 * Central re-export for all platform contracts.
 * Import specific subpaths for tree-shaking:
 *   import { PolicyDecision } from '@gateway/contracts/policy'
 *
 * Or import everything:
 *   import { PolicyDecision, ... } from '@gateway/contracts'
 */

export * from './policy.js';
