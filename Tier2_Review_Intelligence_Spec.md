---
Date: 2026-03-02
Status: ACTIVE
Supersedes: none
System_State: "Bedrock v0.16 synced, Worktrees disabled, Main branch only"
---

# Tier-2 Review Intelligence Spec

**Implementation rule:** Any agent implementing or modifying `server/services/serpapi-reviews.ts` **must** use the exact TypeScript interfaces below. Do not infer or guess the Google Maps / SerpAPI payload shape. Copy these interfaces into the codebase; the TypeScript compiler enforces the data structure and prevents hallucinated fields.

---

## SerpAPI_Reviews_Connector

**Location:** `server/services/serpapi-reviews.ts`

### 1. SerpAPIReviewsRequest

```typescript
interface SerpAPIReviewsRequest {
  engine: "google_maps_reviews";
  data_id: string;           // Google Maps place data_id (from platform_business_map)
  hl?: string;               // Language code, default "en"
  sort_by?: "qualityScore" | "newestFirst" | "ratingHigh" | "ratingLow";
  next_page_token?: string;  // Pagination cursor for subsequent pages (up to 500 reviews)
  api_key: string;           // process.env.SERP_API_KEY — server-side only, never client
}
```

### 2. SerpAPIRawReview (Raw Reviews Index)

```typescript
interface SerpAPIRawReview {
  review_id: string;            // Google's unique review identifier (provenance anchor)
  data_id: string;              // Partition key — ties back to platform_business_map
  place_name: string;

  author: {
    name: string;
    google_user_id: string;
    profile_link: string;       // google.com/maps/contrib/...
    avatar_url: string;
    is_local_guide: boolean;
    total_reviews_count: number;
  };

  rating: 1 | 2 | 3 | 4 | 5;   // Integer star rating — typed, not float
  date_relative: string;        // "2 weeks ago" (display only)
  date_iso: string;             // "2026-02-15T00:00:00.000Z" (index + filter key)
  snippet: string;              // Full review text (chunked at sentence level in index)

  owner_response?: {
    snippet: string;
    date_relative: string;
    date_iso: string;
  };

  review_link: string;          // Direct URL to Google review
  source: "google_maps_reviews"; // Connector identifier
  ingested_at: string;          // ISO timestamp of connector pull
}
```

### 3. ReviewSignal (Review Signals Index)

```typescript
interface ReviewSignal {
  signal_id: string;            // UUID generated on extraction
  review_id: string;            // FK → SerpAPIRawReview.review_id (provenance)
  data_id: string;              // FK → partition key

  // Semantic extraction (Gemini structured output)
  topic: string;                // e.g., "response_time" | "staff_attitude" | "cleanliness" | "pricing"
  aspect: string;               // e.g., "check-in" | "maintenance" | "food_quality" | "follow_up"
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  emotion: "delight" | "frustration" | "satisfaction" | "indifference" | "anger" | "gratitude";

  // Verbatim phrase extraction (for provenance, not paraphrase)
  key_phrases: string[];        // Exact customer language pulled from snippet
  friction_phrases: string[];   // e.g., ["never called back", "took three days", "no one answered"]
  differentiator_phrases: string[]; // e.g., ["incredibly fast", "best in the city", "called immediately"]

  // Context
  star_rating: number;
  is_local_guide: boolean;
  review_date_iso: string;
  extracted_at: string;         // ISO timestamp
}
```

### 4. ReviewArtifact (Artifacts Index — Tier-2 output)

```typescript
interface ReviewArtifact {
  artifact_id: string;          // UUID
  artifact_type: "playbook" | "sop" | "rebuttal_script" | "campaign_brief" | "compliance_alert";
  tenant_id: string;            // site_config_id (tenant partition key)
  generated_by: "cmo_agent" | "vp_sales_agent" | "legal_agent";

  title: string;
  content_markdown: string;     // Full playbook/SOP/brief content

  // Anti-hallucination enforcement (mandatory — no artifact saved without this)
  evidence_review_ids: string[];  // MINIMUM 5, MAXIMUM 20 specific SerpAPIRawReview.review_id values
  evidence_signal_ids: string[];  // Corresponding ReviewSignal.signal_id values
  evidence_summary: string;       // 1–2 sentence human-readable basis statement

  // Success metric (must reference a measurable connector, or marked "unspecified")
  target_metric: string;          // e.g., "contact_to_appointment_rate" | "conversion_rate_lift"
  metric_baseline?: number;
  metric_source: string | "unspecified"; // Data connector name or "unspecified: recommend connector"

  // Lifecycle governance
  status: "draft" | "active" | "superseded" | "archived";
  created_at: string;
  supersedes?: string;            // Previous artifact_id
  frontmatter: {
    date: string;                 // YYYY-MM-DD
    status: "ACTIVE" | "DEPRECATED";
    supersedes?: string;
    system_state: string;         // e.g., "Bedrock v0.16 synced, Worktrees disabled"
  };
}
```

### 5. SerpAPIReviewsResponse (Pagination)

Connector pulls reviews until `next_page_token` is null or review_count >= 500.

```typescript
interface SerpAPIReviewsResponse {
  search_metadata: {
    id: string;
    status: "Success" | "Processing" | "Error";
    created_at: string;
    processed_at: string;
    total_time_taken: number;
  };
  search_parameters: SerpAPIReviewsRequest;
  place_info: {
    title: string;
    data_id: string;
    address: string;
    rating: number;         // Aggregate rating (e.g., 4.6)
    reviews_count: number;  // Total review count (Google aggregate)
    type: string;           // e.g., "Hotel"
  };
  reviews: SerpAPIRawReview[];
  serpapi_pagination?: {
    next_page_token: string;  // Pass to next request's next_page_token param
    next: string;             // Full URL for next page
  };
}
```

---

## Hooks Required

- `migrations/0014_reviews_harvested.sql` — `reviews_harvested` table
- `review_signals` table (migration 0017 or 0018)
- `review_artifacts` table (migration 0018)
- `agents.siteConfigId` and role type columns (0014, 0015)
