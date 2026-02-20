# GRN and Google Cloud Project

## Rule

**For any GRN-related access to Google services (Places, Maps, hotel search, etc.), use the Google Cloud project `grn-travel-agent`.**

The project was originally **grn-travel-agent**; the app has also been known as "a-biz-bit" / "ai-biz-bot", but **GRN features must use the `grn-travel-agent` GCP project** for quotas, billing, and API enablement.

## Env var

- **`GRN_GOOGLE_CLOUD_PROJECT_ID=grn-travel-agent`** — set in `.env` (and in your secret manager for each environment).
- Use this when:
  - Calling Google Places/Maps (or other Google APIs) in a GRN / hotel / B2B travel flow.
  - Creating or using API keys or OAuth clients that are for GRN Connect / travel-agent features.
- **`GOOGLE_CLOUD_PROJECT_ID`** can remain the general app project (e.g. `ai-biz-bot`) for non-GRN features.

## In code

When adding or changing code that calls Google APIs in a GRN context (e.g. hotel grounding, GRN Connect flows, B2B travel UI), use:

- `process.env.GRN_GOOGLE_CLOUD_PROJECT_ID` (expected: `grn-travel-agent`) for project-scoped calls or when selecting which GCP project’s keys/quotas to use.

This keeps GRN-related Google usage under the correct project in Google Cloud Console.
