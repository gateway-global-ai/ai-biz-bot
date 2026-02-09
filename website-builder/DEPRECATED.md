# ⚠️ DEPRECATED - This Directory Has Moved

**Status:** Deprecated as of February 7, 2026

## New Location

The **canonical** deployable website builder is now:
```
platform/website-builder/
```
A copy also exists at `sdk/website-builder/` for SDK packaging; the running app uses **platform/**.

## Why Was This Moved?

As part of the repository cleanup and SDK consolidation effort, all SDK components are being organized under the `sdk/` directory for better structure and maintainability.

## What Should You Do?

- **For Development**: Use **`platform/website-builder/`** (or `sdk/website-builder/`) as the source
- **For Production**: The platform serves from **`platform/`**; see repo root `platform/README.md`
- **For Documentation**: Update any references to point to the new location

## Timeline

- **Deprecated**: February 7, 2026
- **Removal**: This directory will be removed in a future release (Q2 2026)

## Migration Guide

Simply update your import paths or references from:
```
website-builder/
```

To:
```
platform/website-builder/
```

All functionality remains identical - this is just a location change for better organization.

## Questions?

See the main README or open an issue if you have questions about this move.
