# ⚠️ DEPRECATED - Prototype Version

**Status:** Deprecated as of February 7, 2026

## This is a Prototype

This directory contains a **prototype/demo version** of the website builder with:
- Mock data for UI testing
- Hardcoded API keys (security risk)
- Less secure configuration

**DO NOT USE IN PRODUCTION**

## Use the Production Version Instead

The production-ready website builder is located at:
```
sdk/website-builder/
```

## Key Differences

| Feature | This (Prototype) | Production (SDK) |
|---------|------------------|------------------|
| API Key Handling | ❌ Hardcoded | ✅ Dynamic/Secure |
| Backend Proxy | ❌ No | ✅ Yes |
| Mock Data | ✅ Yes (for demos) | ❌ No |
| Security | ❌ Poor | ✅ Production-ready |

## Timeline

- **Deprecated**: February 7, 2026
- **Removal**: This directory will be removed in Q2 2026

## What Should You Do?

1. **Stop using this version** for any development or production work
2. **Switch to** `sdk/website-builder/` immediately
3. **Do not commit** any new changes to this directory
4. **Remove any references** to this directory in your code

## Questions?

See `sdk/website-builder/README.md` for the production version documentation.
