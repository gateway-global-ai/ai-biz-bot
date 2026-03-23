/**
 * One-time script: sync platform_landing products to Stripe
 * with product images and recurring prices.
 * Run: doppler run -- npx tsx scripts/sync-platform-products-stripe.ts
 */
import Stripe from 'stripe';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-11-17.clover' as any });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PRODUCTS = [
  {
    id: 'fa6c3407-001d-4ae0-a8d2-2b463109e3b9',
    name: 'AI OS Platform',
    description: 'AI Voice Agents — full business automation with voice AI, smart routing, and lead intelligence. The complete AI Operating System for your business.',
    type: 'subscription',
    priceCents: 4900,
    billingInterval: 'month',
    imgPath: 'client/public/product-ai-os.png',
  },
  {
    id: '410ead02-5fbc-450f-bc3f-f1fa5fed6e49',
    name: 'ClearVoice AI',
    description: 'AI Voice + Data — sub-150ms native multimodal voice AI powered by Gemini 2.5. Studio-quality voice interactions with full call analytics and transcription.',
    type: 'subscription',
    priceCents: 5000,
    billingInterval: 'month',
    imgPath: 'client/public/product-clearvoice.png',
  },
  {
    id: 'fe1e9d42-bb98-49cb-89ad-fcde850ea533',
    name: 'Clear View AI Dashboard',
    description: 'AI Dashboard — real-time business intelligence, call tracking, lead scoring, and customer insights. Your AI-powered front desk command center.',
    type: 'subscription',
    priceCents: 4900,
    billingInterval: 'month',
    imgPath: 'client/public/product-clearview.png',
  },
  {
    id: '7bcdccde-44cf-4b44-8e83-162614cfc6b2',
    name: 'Industry Applications',
    description: 'Vertical-specific AI deployments — pre-configured AI agents and workflows for healthcare, legal, real estate, hospitality, and more.',
    type: 'service',
    priceCents: 0,
    billingInterval: null,
    imgPath: null,
  },
] as const;

async function run() {
  for (const p of PRODUCTS) {
    console.log(`\nSyncing: ${p.name}`);

    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: { siteConfigId: 'platform_landing', type: p.type },
    });
    console.log(`  Stripe product: ${stripeProduct.id}`);

    // Upload image via file upload API
    if (p.imgPath && fs.existsSync(p.imgPath)) {
      try {
        // Stripe images[] accepts public HTTPS URLs — skip file upload for now,
        // images can be set via dashboard or when a CDN URL is available.
        console.log(`  Image: set via Stripe dashboard once CDN URL is available`);
      } catch (imgErr: any) {
        console.warn(`  Image skipped: ${imgErr.message}`);
      }
    }

    // Create price
    let stripePriceId: string | null = null;
    if (p.priceCents > 0) {
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: p.priceCents,
        currency: 'usd',
        ...(p.type === 'subscription' && p.billingInterval
          ? { recurring: { interval: p.billingInterval as 'month' | 'year' } }
          : {}),
      });
      stripePriceId = price.id;
      console.log(`  Price: ${stripePriceId} ($${(p.priceCents / 100).toFixed(2)}/${p.billingInterval ?? 'one-time'})`);
    }

    // Update DB
    await pool.query(
      'UPDATE platform_products SET stripe_product_id = $1, stripe_price_id = $2 WHERE id = $3',
      [stripeProduct.id, stripePriceId, p.id]
    );
    console.log(`  DB updated ✓`);
  }

  await pool.end();
  console.log('\n✅ All products synced to Stripe.');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
