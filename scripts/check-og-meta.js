#!/usr/bin/env node
/**
 * Check that OG meta tags are present on key pages (for build/CI or manual runs).
 * Use a social-crawler User-Agent so the server returns the OG HTML stub.
 *
 * Usage:
 *   node scripts/check-og-meta.js [baseUrl]
 *   BASE_URL=https://staging.example.com node scripts/check-og-meta.js
 *
 * Optional: CHECK_SLUG=my-business node scripts/check-og-meta.js
 *   Also checks /biz/:slug for that business page.
 */

// Dev server runs on 3004; override with BASE_URL or first arg
const baseUrl = process.env.BASE_URL || process.argv[2] || 'http://localhost:3004';
const slug = process.env.CHECK_SLUG;
const crawlerUA = 'facebookexternalhit/1.1';

async function fetchHtml(path) {
  const url = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': crawlerUA } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}

function extractMeta(html) {
  const og = {};
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/);
  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/);
  const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/);
  if (titleMatch) og.title = titleMatch[1];
  if (descMatch) og.description = descMatch[1];
  if (imageMatch) og.image = imageMatch[1];
  return og;
}

async function checkPath(path, label) {
  const html = await fetchHtml(path);
  const og = extractMeta(html);
  const missing = [];
  if (!og.title || !og.title.trim()) missing.push('og:title');
  if (!og.description || !og.description.trim()) missing.push('og:description');
  if (!og.image || !og.image.trim()) missing.push('og:image');
  return { path, label, og, missing };
}

async function main() {
  const checks = [{ path: '/', label: 'Home' }];
  if (slug) checks.push({ path: `/biz/${slug}`, label: `Business /biz/${slug}` });

  let failed = 0;
  for (const { path, label } of checks) {
    try {
      const { og, missing } = await checkPath(path, label);
      if (missing.length > 0) {
        console.warn(`[OG] ${label} (${path}): missing ${missing.join(', ')}`);
        failed++;
      } else {
        console.log(`[OG] ${label}: ok (title="${(og.title || '').slice(0, 50)}…")`);
      }
    } catch (err) {
      const url = `${baseUrl.replace(/\/$/, '')}${path}`;
      console.warn(`[OG] ${label} (${path}): fetch failed - ${err.message}`);
      console.warn(`[OG] Could not connect to ${url}. Is the server running? Try: BASE_URL=http://localhost:3004 npm run check:og`);
      failed++;
    }
  }

  if (failed > 0) {
    console.warn(`[OG] ${failed} check(s) failed. Start the app (e.g. npm run dev) or set BASE_URL to a running host.`);
    process.exit(1);
  }
  process.exit(0);
}

main();
