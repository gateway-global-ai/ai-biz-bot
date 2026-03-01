# Minimal Google APIs for This Project’s API Key(s)

This doc is derived from actual HTTP calls in the codebase. Use it to **restrict** your Google API key to only the APIs below and turn off the rest in GCP.

---

## Key roles (reminder)

- **GEMINI_API_KEY** — AI Studio / Generative Language only (often a separate key from Google Cloud).
- **Server Maps/Places key** (one of `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_GROUNDING_LITE_API_KEY`, `GOOGLE_PLACES_API_KEY`, or `GOOGLE_API_KEY`) — used for Maps/Places and Grounding Lite; must be the **same** key for both.

If a single “Google API key” in GCP has many APIs enabled, restrict it to the list below.

---

## GEMINI_API_KEY — minimal APIs (this key only)

This key is used **only** for `generativelanguage.googleapis.com` (Gemini Live, TTS, generateContent, etc.). No Gmail, Drive, or Storage calls use this key.

**Enable only:**

| GCP API name | Why |
|--------------|-----|
| **Generative Language API** | Required — all Gemini/generativelanguage calls use this. |
| **Gemini for Google Cloud API** | Required — same Gemini backend in GCP; one or both may appear in the console. |

**You can turn OFF for GEMINI_API_KEY:**

- Gmail API
- Google Cloud APIs (the broad meta-API)
- Google Drive API
- Google Cloud Storage JSON API
- Google My Business API
- IAM Service Account Credentials API
- Organization Policy API
- Secret Manager API

Gmail and Drive are used via **OAuth** and **GOOGLE_SERVICE_ACCOUNT_JSON**, not via `GEMINI_API_KEY`. Restrict this key to Generative Language / Gemini for Google Cloud only.

---

## GOOGLE_API_KEY (server Maps/Places, optional Gemini fallback)

When this key is used as the server Maps/Places key (via `getServerMapsApiKey()`) it hits: Places API (New), legacy Places API, **mapstools.googleapis.com** (Maps Grounding Lite), and optionally areainsights (Places Aggregate). It may also be used for Gemini in a few routes (b2b, native audio) as fallback.

**You have enabled:** Geocoding API, Geolocation API, Places API, Places API (New), Gemini for Google Cloud API, Places Aggregate API, Time Zone API.

- **Add if missing:** **Maps Grounding Lite** — required for place discovery (`placeDiscoveryService`) and hotel MCP (`mapstools.googleapis.com/mcp`). Without it, Grounding Lite / search_places calls will fail.
- **Optional (this app doesn’t call them):** Geocoding API, Geolocation API, Time Zone API. Safe to remove for a minimal set, or leave enabled if you use them elsewhere.
- **Required for this app:** Places API, Places API (New), Places Aggregate API (if you use placesAggregate MCP), Gemini for Google Cloud API (if this key is used as Gemini fallback).

---

## APIs this codebase actually uses (enable only these)

| GCP API name | Used for | Evidence in code |
|--------------|----------|-------------------|
| **Gemini for Google Cloud API** | Generative Language (Gemini) when using a Cloud key | `generativelanguage.googleapis.com` (routes, voiceGemini, geminiService, b2b-routes, etc.) |
| **Places API (New)** | Place details, searchText, photos (v1) | `places.googleapis.com/v1/places/*`, `places:searchText` |
| **Places API** (legacy) | Place autocomplete, details, photo (legacy endpoint) | `maps.googleapis.com/maps/api/place/autocomplete`, `place/details`, `place/photo` |
| **Maps Grounding Lite** | Place ID discovery, MCP search_places | `mapstools.googleapis.com/mcp` (placeDiscoveryService, mcp-hotels-logic, check-google-key-permissions) |
| **Places Aggregate API** | Area/competitor insights (placesAggregate MCP) | `areainsights.googleapis.com/v1:computeInsights` |

**Optional (enable only if you use the feature):**

| GCP API name | Used for | When to enable |
|--------------|----------|-----------------|
| **Geocoding API** | Address ↔ coordinates | Only if you have flows that call the Geocoding API (this codebase does not call it directly; some Maps SDKs may use it) |
| **Time Zone API** | Time zone from lat/lng | Only if you call it (this codebase uses IANA timezone strings only, no Time Zone API calls) |

---

## APIs you can turn OFF (not used by this app)

From your list, the following are **not** used by this codebase for the API key. You can disable them for this key/project to reduce scope and risk:

- Address Validation API  
- Analytics Hub API  
- App Engine Admin API  
- Cloud API Registry API  
- Cloud Billing API  
- Cloud Build API  
- Cloud Firestore API  
- Cloud Logging API  
- Cloud Monitoring API  
- Cloud OS Login API  
- Cloud Resource Manager API  
- Firebase App Distribution API  
- Firebase App Hosting API  
- Firebase Cloud Messaging API  
- Firebase Data Connect API  
- Firebase Hosting API  
- Firebase Installations API  
- Firebase Management API  
- Firebase Remote Config API  
- Firebase Remote Config Realtime API  
- Firebase Rules API  
- Geolocation API  
- Google Cloud APIs (if it’s a broad meta-API; keep only what’s needed)  
- Google Cloud Storage JSON API  
- IAM Service Account Credentials API  
- Identity and Access Management (IAM) API  
- Identity Toolkit API  
- Organization Policy API  
- **Places UI Kit** — only if this key is server-only; client Maps key can have Places UI Kit  
- Secret Manager API  
- Service Management API  
- Service Usage API  
- Token Service API  

**Note:** Gmail, Calendar, Drive, etc. are used via **OAuth** and **service account** (`GOOGLE_SERVICE_ACCOUNT_JSON`), not via this API key. They don’t need to be enabled for the key used for Maps/Places/Gemini.

---

## Summary: minimal set to enable for the server Maps/Places + Gemini key

1. **Gemini for Google Cloud API** (if this key is used for Gemini)  
2. **Places API (New)**  
3. **Places API** (legacy)  
4. **Maps Grounding Lite** (mapstools – enable in Cloud Console / `gcloud` as needed)  
5. **Places Aggregate API** (if you use the placesAggregate MCP / area insights)

After that, remove every other API from this key (or create a new key with only these and switch Doppler to it).

See also: [docs/API_KEYS_DOPPLER.md](./API_KEYS_DOPPLER.md), [server/config/mapsApiKey.ts](../server/config/mapsApiKey.ts).
