import { useState } from 'react';
import { Link } from 'wouter';
import {
  Globe, Search, MapPin, Star, Image, Code2, Key, Database,
  Mic, BookOpen, ChevronRight, ExternalLink, Copy, ArrowLeft,
  Layers, Shield, Zap
} from 'lucide-react';

const Section = ({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-2" data-testid={`text-section-${id}`}>{title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{subtitle}</p>
    </div>
    {children}
  </section>
);

const CodeBlock = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      {label && <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</div>}
      <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-indigo-300 overflow-x-auto leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
      <button
        className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid="button-copy-code"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <span className="text-[10px] text-green-400">Copied</span> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const ParamTable = ({ params }: { params: { name: string; type: string; description: string }[] }) => (
  <div className="rounded-xl border border-slate-800 overflow-hidden">
    <div className="grid grid-cols-[160px_100px_1fr] bg-slate-800/80 px-4 py-2.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Parameter</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</span>
    </div>
    {params.map((p, i) => (
      <div key={p.name} className={`grid grid-cols-[160px_100px_1fr] px-4 py-3 border-t border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950'}`}>
        <span className="text-xs font-mono text-indigo-400">{p.name}</span>
        <span className="text-xs text-slate-500">{p.type}</span>
        <span className="text-xs text-slate-300">{p.description}</span>
      </div>
    ))}
  </div>
);

const TierCard = ({ tier, color, fields }: { tier: string; color: string; fields: string }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs font-bold text-white uppercase tracking-wider">{tier}</span>
    </div>
    <p className="text-xs text-slate-400 font-mono leading-relaxed">{fields}</p>
  </div>
);

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'autocomplete', label: 'Autocomplete', icon: Search },
  { id: 'details', label: 'Place Details', icon: MapPin },
  { id: 'ai-summaries', label: 'AI Summaries', icon: Star },
  { id: 'photos', label: 'Photos API', icon: Image },
  { id: 'client-libraries', label: 'Client Libraries', icon: Code2 },
  { id: 'how-we-use-it', label: 'How We Use It', icon: Database },
  { id: 'oauth', label: 'Google OAuth', icon: Key },
];

export default function GooglePlacesSdk() {
  return (
    <div className="min-h-screen bg-slate-950" data-testid="page-google-places-sdk">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Back link */}
        <Link href="/sdk" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mb-10" data-testid="link-back-sdk">
          <ArrowLeft className="w-4 h-4" /> Back to SDK
        </Link>

        {/* Hero */}
        <div className="mb-16" data-testid="hero-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Globe className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Google Places API Integration</h1>
              <p className="text-slate-400 text-sm mt-1">Developer Reference for Places API (New) &mdash; Autocomplete, Place Details, Photos, and AI Summaries</p>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-16 pb-8 border-b border-slate-800/50">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors"
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </a>
          ))}
        </div>

        <div className="space-y-20">

          {/* ── Overview ── */}
          <Section id="overview" title="Overview" subtitle="Places API (New) is a major upgrade to the legacy Places API, built on Google Cloud infrastructure with AI-powered features via Gemini.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Globe, label: '250M+ Places', desc: 'Comprehensive global database of businesses and locations' },
                { icon: Layers, label: '200+ Place Types', desc: 'EV charging, specific restaurant types, and more' },
                { icon: Star, label: 'AI Summaries', desc: 'Gemini-powered generative summaries and review synthesis' },
                { icon: Zap, label: 'Real-Time Data', desc: 'Dynamic info: EV charging availability, gas prices, holiday hours' },
                { icon: Shield, label: 'Field Masking', desc: 'Request only needed fields to optimize cost and performance' },
                { icon: Key, label: 'Modern Auth', desc: 'OAuth-based authentication alongside API key support' },
              ].map(f => (
                <div key={f.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{f.label}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white mb-3">Field Mask We Use</h3>
            <CodeBlock code={`const fieldMask = [
  'id', 'displayName', 'formattedAddress', 'nationalPhoneNumber',
  'websiteUri', 'rating', 'userRatingCount', 'types', 'businessStatus',
  'photos', 'regularOpeningHours', 'currentOpeningHours', 'editorialSummary',
  'addressComponents', 'primaryType', 'primaryTypeDisplayName',
  'generativeSummary', 'reviewSummary', 'reviews'
].join(',');`} />
          </Section>

          {/* ── Autocomplete ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="autocomplete" title="Autocomplete (New)" subtitle="Returns place and query predictions as the user types. POST request with JSON body.">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-600/15 px-2 py-1 rounded">POST</span>
                <code className="text-sm text-slate-300 font-mono">https://places.googleapis.com/v1/places:autocomplete</code>
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">Parameters</h3>
              <div className="mb-6">
                <ParamTable params={[
                  { name: 'input *', type: 'string', description: 'Text search string (full words, substrings, place names, addresses, plus codes)' },
                  { name: 'includedPrimaryTypes', type: 'string[]', description: 'Filter results by place types (e.g. "restaurant", "cafe")' },
                  { name: 'locationBias', type: 'object', description: 'Bias results toward a location (circle with center + radius)' },
                  { name: 'locationRestriction', type: 'object', description: 'Restrict results to a geographic area (rectangle bounds)' },
                  { name: 'languageCode', type: 'string', description: 'Language for results (e.g. "en", "es")' },
                  { name: 'regionCode', type: 'string', description: 'Region code for result formatting (e.g. "US")' },
                  { name: 'sessionToken', type: 'string', description: 'Session token for billing grouping' },
                  { name: 'includeQueryPredictions', type: 'boolean', description: 'Include query predictions in response (default: false)' },
                ]} />
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">cURL Example</h3>
              <CodeBlock code={`curl -X POST -d '{
  "input": "Sicilian piz",
  "locationBias": {
    "circle": {
      "center": { "latitude": 37.7937, "longitude": -122.3965 },
      "radius": 500.0
    }
  }
}' \\
-H 'Content-Type: application/json' \\
-H "X-Goog-Api-Key: API_KEY" \\
https://places.googleapis.com/v1/places:autocomplete`} />

              <h3 className="text-sm font-semibold text-white mt-6 mb-3">Response Structure</h3>
              <CodeBlock code={`{
  "suggestions": [
    {
      "placePrediction": {
        "placeId": "ChIJ...",
        "text": { "text": "Sicilian Pizza Kitchen, Grant Ave, SF" },
        "structuredFormat": {
          "mainText": { "text": "Sicilian Pizza Kitchen" },
          "secondaryText": { "text": "Grant Avenue, San Francisco, CA" }
        }
      }
    },
    {
      "queryPrediction": {
        "text": { "text": "Sicilian Pizza & Pasta" }
      }
    }
  ]
}`} />
            </Section>
          </div>

          {/* ── Place Details ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="details" title="Place Details (New)" subtitle="Retrieve comprehensive information about a place using its place ID. FieldMask is required.">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-600/15 px-2 py-1 rounded">GET</span>
                <code className="text-sm text-slate-300 font-mono">{'https://places.googleapis.com/v1/places/{PLACE_ID}'}</code>
              </div>

              <p className="text-sm text-slate-300 mb-6">
                Specify the FieldMask via the <code className="text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded text-xs">X-Goog-FieldMask</code> header or <code className="text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded text-xs">fields</code> URL parameter. Only requested fields are returned and billed.
              </p>

              <h3 className="text-sm font-semibold text-white mb-4">Field Tiers &amp; Billing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <TierCard tier="Essentials IDs Only" color="#94a3b8" fields="id, name, photos, attributions" />
                <TierCard tier="Essentials" color="#60a5fa" fields="formattedAddress, location, types, addressComponents, plusCode" />
                <TierCard tier="Pro" color="#a78bfa" fields="displayName, businessStatus, googleMapsUri, primaryType, utcOffsetMinutes" />
                <TierCard tier="Enterprise" color="#f59e0b" fields="rating, userRatingCount, websiteUri, nationalPhoneNumber, priceLevel, regularOpeningHours" />
                <div className="md:col-span-2">
                  <TierCard tier="Enterprise + Atmosphere" color="#ef4444" fields="reviews, editorialSummary, generativeSummary, delivery, dineIn, takeout, servesBeer, servesWine, parkingOptions, paymentOptions, outdoorSeating, reservable" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">cURL Example</h3>
              <CodeBlock code={`curl -X GET \\
-H 'Content-Type: application/json' \\
-H "X-Goog-Api-Key: API_KEY" \\
-H "X-Goog-FieldMask: id,displayName,formattedAddress,rating,reviews,generativeSummary" \\
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw`} />

              <h3 className="text-sm font-semibold text-white mt-6 mb-3">Response Example</h3>
              <CodeBlock code={`{
  "id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "displayName": { "text": "Googleplex", "languageCode": "en" },
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
  "rating": 4.4,
  "reviews": [
    {
      "rating": 5,
      "text": { "text": "Amazing campus with great facilities..." },
      "authorAttribution": { "displayName": "John D." },
      "relativePublishTimeDescription": "2 months ago"
    }
  ],
  "generativeSummary": {
    "overview": {
      "text": "The Googleplex is the corporate headquarters of Google..."
    }
  }
}`} />
            </Section>
          </div>

          {/* ── AI Summaries ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="ai-summaries" title="AI-Powered Summaries" subtitle="Google leverages Gemini AI to generate intelligent summaries from place data, reviews, and editorial content.">
              <div className="space-y-4 mb-8">
                {[
                  { num: 1, field: 'generativeSummary', label: 'Generative Summary', desc: 'AI-generated place overview synthesized from multiple data sources. Most comprehensive. Path: generativeSummary.overview.text', color: '#6366f1' },
                  { num: 2, field: 'reviewSummary', label: 'Review Summary', desc: 'AI-powered synthesis of customer reviews highlighting key themes and sentiment. Path: reviewSummary.text.text', color: '#8b5cf6' },
                  { num: 3, field: 'editorialSummary', label: 'Editorial Summary', desc: 'Curated editorial description of the place. Path: editorialSummary.overview', color: '#60a5fa' },
                  { num: 4, field: 'description', label: 'Description', desc: 'Basic description fallback when other summaries are unavailable.', color: '#94a3b8' },
                ].map(s => (
                  <div key={s.field} className="flex items-start gap-4 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white" style={{ background: s.color }}>
                      {s.num}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{s.label}</span>
                        <code className="text-[10px] text-indigo-400 bg-slate-800 px-1.5 py-0.5 rounded">{s.field}</code>
                      </div>
                      <p className="text-xs text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">Priority Selection Logic</h3>
              <CodeBlock code={`function getBestSummary(place: PlaceResult): string {
  return place.generativeSummary?.overview?.text
    ?? place.reviewSummary?.text?.text
    ?? place.editorialSummary?.overview
    ?? place.description
    ?? 'No summary available';
}`} />
            </Section>
          </div>

          {/* ── Photos API ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="photos" title="Photos API" subtitle="Retrieve high-quality place photos using photo references from Place Details responses.">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-600/15 px-2 py-1 rounded">GET</span>
                <code className="text-sm text-slate-300 font-mono">{'https://places.googleapis.com/v1/{PHOTO_NAME}/media'}</code>
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">How It Works</h3>
              <ol className="space-y-3 mb-6">
                {[
                  'Request Place Details with "photos" in your FieldMask',
                  'Each photo object contains a name like places/PLACE_ID/photos/PHOTO_REF',
                  'Use that name to fetch the actual image via the Photos endpoint',
                  'Specify maxWidthPx and/or maxHeightPx (1-4800) as query params',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-400">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>

              <CodeBlock code={`curl -X GET \\
-H "X-Goog-Api-Key: API_KEY" \\
"https://places.googleapis.com/v1/places/ChIJj61d.../photos/AelY.../media?maxWidthPx=800&maxHeightPx=600"`} />

              <h3 className="text-sm font-semibold text-white mt-6 mb-3">Photo Reference from Place Details</h3>
              <CodeBlock code={`{
  "photos": [
    {
      "name": "places/ChIJj61d.../photos/AelY_Cv...",
      "widthPx": 4032,
      "heightPx": 3024,
      "authorAttributions": [
        { "displayName": "A Google User", "uri": "//maps.google.com/..." }
      ]
    }
  ]
}`} />
            </Section>
          </div>

          {/* ── Client Libraries ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="client-libraries" title="Client Libraries" subtitle="Official Google-maintained client libraries for Places API (New) across multiple languages.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { lang: 'Node.js', cmd: 'npm install @googlemaps/places', color: '#22c55e', link: 'https://github.com/googleapis/google-cloud-node/tree/main/packages/google-maps-places' },
                  { lang: 'Python', cmd: 'pip install --upgrade google-maps-places', color: '#3b82f6', link: 'https://github.com/googleapis/google-cloud-python/tree/main/packages/google-maps-places' },
                  { lang: 'Go', cmd: 'go get cloud.google.com/go/maps', color: '#60a5fa', link: 'https://github.com/googleapis/google-cloud-go/tree/main/maps/places/apiv1' },
                  { lang: 'Maps JavaScript API', cmd: 'Client-side via google.maps.places', color: '#f59e0b', link: 'https://developers.google.com/maps/documentation/javascript/place-get-started' },
                ].map(lib => (
                  <div key={lib.lang} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: lib.color }} />
                        {lib.lang}
                      </span>
                      <a href={lib.link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300" data-testid={`link-lib-${lib.lang.toLowerCase().replace(/\s+/g, '-')}`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <code className="text-xs text-indigo-300 font-mono">{lib.cmd}</code>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* ── How We Use It ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="how-we-use-it" title="How We Use It" subtitle="Our platform leverages Google Places data throughout the customer lifecycle for intelligent business automation.">
              <div className="space-y-6 mb-8">
                {[
                  {
                    icon: Search, title: 'Business Discovery',
                    items: [
                      'Location-aware search using customer geolocation',
                      'Comprehensive business data retrieval from Google Places',
                      'Gemini AI analysis of business profiles',
                      'Auto-detect industry from 200+ place types',
                      'Create business profile with AI-generated insights',
                    ]
                  },
                  {
                    icon: Database, title: 'Business Intelligence',
                    items: [
                      'Business info: name, address, phone, website, hours',
                      'Customer ratings and review counts',
                      'High-quality business photos',
                      'Gemini-generated business descriptions',
                      'Last 5 reviews with AI analysis',
                      'Real-time operational status (open/closed)',
                    ]
                  },
                  {
                    icon: Mic, title: 'Voice AI Generation',
                    items: [
                      'Analyze business profile to understand type and characteristics',
                      'Match business with industry-specific pain points',
                      'Generate voice AI workflows with nodes and context',
                      'Create personalized system prompts',
                      'Configure shared data variables for voice AI',
                    ]
                  },
                ].map(flow => (
                  <div key={flow.title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
                        <flow.icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{flow.title}</h3>
                    </div>
                    <ul className="space-y-1.5">
                      {flow.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <ChevronRight className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">Data Storage Model</h3>
              <CodeBlock code={`-- site_configs table stores Places data as JSONB
CREATE TABLE site_configs (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER REFERENCES customers(id),
  business_name   TEXT,
  google_place_id TEXT,
  place_data      JSONB,          -- Complete Google Places API response
  place_rating    NUMERIC(2,1),
  place_review_count INTEGER,
  place_website   TEXT,
  industry        TEXT,            -- Auto-detected from place types
  created_at      TIMESTAMPTZ DEFAULT NOW()
);`} />
            </Section>
          </div>

          {/* ── OAuth Setup ── */}
          <div className="border-t border-slate-800/50 pt-16">
            <Section id="oauth" title="Google OAuth Setup" subtitle="Configure OAuth 2.0 for Google Workspace integrations: Sheets, Calendar, and Gmail.">
              <h3 className="text-sm font-semibold text-white mb-3">Required Scopes</h3>
              <div className="rounded-xl border border-slate-800 overflow-hidden mb-6">
                {[
                  { service: 'Google Sheets', scope: 'https://www.googleapis.com/auth/spreadsheets' },
                  { service: 'Google Calendar', scope: 'https://www.googleapis.com/auth/calendar' },
                  { service: 'Gmail (Send)', scope: 'https://www.googleapis.com/auth/gmail.send' },
                  { service: 'Gmail (Read)', scope: 'https://www.googleapis.com/auth/gmail.readonly' },
                ].map((s, i) => (
                  <div key={s.service} className={`flex items-center gap-4 px-4 py-3 border-t border-slate-800/50 first:border-t-0 ${i % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950'}`}>
                    <span className="text-xs font-semibold text-white w-36">{s.service}</span>
                    <code className="text-xs text-indigo-400 font-mono">{s.scope}</code>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-white mb-3">Redirect URI Pattern</h3>
              <CodeBlock code={`# Development
http://localhost:3000/api/customer/google/oauth/callback

# Production
https://your-domain.com/api/customer/google/oauth/callback`} />

              <h3 className="text-sm font-semibold text-white mt-6 mb-3">Security Notes</h3>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <ul className="space-y-2">
                  {[
                    'Never commit OAuth credentials to version control',
                    'Use environment variables for sensitive data',
                    'Store tokens securely in the database (encrypted in production)',
                    'Implement token refresh logic for expired tokens',
                    'Always use HTTPS in production',
                  ].map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-slate-800/50 pt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" data-testid="footer-section">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">Official Documentation</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Places API Overview', href: 'https://developers.google.com/maps/documentation/places/web-service/overview' },
                  { label: 'Autocomplete Docs', href: 'https://developers.google.com/maps/documentation/places/web-service/place-autocomplete' },
                  { label: 'Place Details Docs', href: 'https://developers.google.com/maps/documentation/places/web-service/place-details' },
                  { label: 'Pricing & SKUs', href: 'https://developers.google.com/maps/billing-and-pricing/pricing' },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                    data-testid={`link-docs-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/sdk" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300" data-testid="link-footer-back-sdk">
                <ArrowLeft className="w-4 h-4" /> Back to SDK Showcase
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
