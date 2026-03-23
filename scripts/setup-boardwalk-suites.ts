/**
 * Setup Script: Boardwalk Suites Lafayette
 *
 * Creates the complete partner profile for Boardwalk Suites Lafayette:
 * - Customer account for Jason Trindade
 * - Site configuration
 * - Owner business data
 * - Featured partner entry (if GRN DB accessible)
 * - Cloudbeds PMS integration (if CLOUDBEDS_API_KEY is set when the script runs)
 *
 * Run: npm run setup:boardwalk  (Doppler injects DATABASE_URL; optional CLOUDBEDS_API_KEY)
 * Or:  npx tsx scripts/setup-boardwalk-suites.ts  with DATABASE_URL + CLOUDBEDS_API_KEY in .env / shell (no Doppler)
 *
 * Tenant keys are stored in site_pms_integrations — you do not need a global Cloudbeds key in Doppler
 * if you inject the key only for this one-shot setup via the shell.
 */

import "dotenv/config";
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db.js';
import { customerAccounts, siteConfigs, ownerBusinessData, featuredPartners, sitePmsIntegrations } from '../shared/schema.js';
import { and, eq } from 'drizzle-orm';

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const BOARDWALK_SUITES = {
  placeId: 'ChIJB4qU6oXvJIgR_2p602OaK_U',
  businessName: 'Boardwalk Suites Lafayette',
  address: '1605 N University Ave, Lafayette, LA 70506',
  website: 'boardwalksuites.com',
  coordinates: { lat: 30.1798, lng: -92.0058 },
  owner: {
    name: 'Jason Trindade',
    phone: '702-540-5471',
    email: 'lafayette@boardwalksuites.com',
  },
  cityCode: 'LAF', // Lafayette
  category: 'Extended Stay Hotel',
  badgeLabel: 'Extended Stay Expert',
  cloudbedsPropertyId: '315701',
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return digits.slice(1);
  }
  return digits;
}

export type BoardwalkPartnerSetupResult = {
  siteConfigId: string;
  accountId: string;
  placeId: string;
};

/**
 * Idempotent partner row setup (site, owner data, featured partner, Cloudbeds PMS).
 * Used by `npm run setup:boardwalk` and `npm run demo:boardwalk-agent`.
 */
export async function ensureBoardwalkPartnerSetup(): Promise<BoardwalkPartnerSetupResult> {
  const normalizedPhone = normalizePhone(BOARDWALK_SUITES.owner.phone);
  console.log(`📱 Creating customer account for ${BOARDWALK_SUITES.owner.name} (${normalizedPhone})...`);

  let customerAccount = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.phone, normalizedPhone))
    .limit(1);

  if (customerAccount.length === 0) {
    const [newAccount] = await db
      .insert(customerAccounts)
      .values({
        phone: normalizedPhone,
        name: BOARDWALK_SUITES.owner.name,
        email: BOARDWALK_SUITES.owner.email,
        plan: 'premium',
        isActive: true,
      })
      .returning();

    customerAccount = [newAccount];
    console.log(`✅ Created customer account: ${newAccount.id}`);
  } else {
    await db
      .update(customerAccounts)
      .set({
        name: BOARDWALK_SUITES.owner.name,
        email: BOARDWALK_SUITES.owner.email,
        plan: 'premium',
        isActive: true,
      })
      .where(eq(customerAccounts.id, customerAccount[0].id));

    console.log(`✅ Updated existing customer account: ${customerAccount[0].id}`);
  }

  const accountId = customerAccount[0].id;

  console.log(`\n🌐 Creating site configuration for ${BOARDWALK_SUITES.businessName}...`);

  let siteConfig = await db
    .select()
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, BOARDWALK_SUITES.placeId))
    .limit(1);

  const placeData = {
    name: BOARDWALK_SUITES.businessName,
    formattedAddress: BOARDWALK_SUITES.address,
    location: BOARDWALK_SUITES.coordinates,
    websiteUri: `https://${BOARDWALK_SUITES.website}`,
  };

  if (siteConfig.length === 0) {
    const [newSite] = await db
      .insert(siteConfigs)
      .values({
        ownerId: accountId,
        name: BOARDWALK_SUITES.businessName,
        domain: BOARDWALK_SUITES.website,
        placeId: BOARDWALK_SUITES.placeId,
        placeData: placeData,
        chatbotEnabled: true,
        voiceConciergeEnabled: true,
        systemPromptOverride: `You are the concierge for ${BOARDWALK_SUITES.businessName}, an extended-stay hotel in Lafayette, Louisiana. Emphasize our full kitchens, spacious suites, and prime location near the University and medical district.`,
        plan: 'pro',
      })
      .returning();

    siteConfig = [newSite];
    console.log(`✅ Created site config: ${newSite.id}`);
  } else {
    await db
      .update(siteConfigs)
      .set({
        ownerId: accountId,
        name: BOARDWALK_SUITES.businessName,
        domain: BOARDWALK_SUITES.website,
        placeData: placeData,
        plan: 'pro',
        systemPromptOverride: `You are the concierge for ${BOARDWALK_SUITES.businessName}, an extended-stay hotel in Lafayette, Louisiana. Emphasize our full kitchens, spacious suites, and prime location near the University and medical district.`,
      })
      .where(eq(siteConfigs.id, siteConfig[0].id));

    console.log(`✅ Updated existing site config: ${siteConfig[0].id}`);
  }

  console.log(`\n📊 Setting up owner business data...`);

  let ownerData = await db
    .select()
    .from(ownerBusinessData)
    .where(eq(ownerBusinessData.placeId, BOARDWALK_SUITES.placeId))
    .limit(1);

  const ownerDataPayload = {
    placeId: BOARDWALK_SUITES.placeId,
    ownerId: accountId,
    customDescription: `Premier extended-stay hotel in Lafayette's Oil Center district. Full kitchens, spacious suites, and prime location near the University and medical district. Perfect for professionals, medical staff, and extended stays.`,
    specialOffers: ['Extended Stay Discounts', 'Medical Professional Rates', 'Monthly Rates Available'],
    ownerStory: `At Boardwalk Suites, we believe in providing more than just a room—we offer a home away from home. Our fully-equipped kitchens and spacious suites make extended stays comfortable and convenient.`,
    customHours: '24/7 Front Desk',
    contactPreferences: {
      preferredMethod: 'email',
      email: BOARDWALK_SUITES.owner.email,
      phone: BOARDWALK_SUITES.owner.phone,
    },
  };

  if (ownerData.length === 0) {
    await db.insert(ownerBusinessData).values(ownerDataPayload);
    console.log(`✅ Created owner business data`);
  } else {
    await db
      .update(ownerBusinessData)
      .set(ownerDataPayload)
      .where(eq(ownerBusinessData.placeId, BOARDWALK_SUITES.placeId));
    console.log(`✅ Updated owner business data`);
  }

  console.log(`\n⭐ Adding to featured_partners table (Main DB)...`);

  try {
    const existing = await db
      .select()
      .from(featuredPartners)
      .where(eq(featuredPartners.googlePlaceId, BOARDWALK_SUITES.placeId))
      .limit(1);

    const featuredPartnerData = {
      googlePlaceId: BOARDWALK_SUITES.placeId,
      businessName: BOARDWALK_SUITES.businessName,
      cityCode: BOARDWALK_SUITES.cityCode,
      category: BOARDWALK_SUITES.category,
      badgeLabel: BOARDWALK_SUITES.badgeLabel,
      aiHook: `At Boardwalk Suites Lafayette, you're not just getting a room—you're getting a full kitchen and the space to actually live while you're here.`,
      aiTags: ['extended stay', 'full kitchens', 'suites', 'lafayette', 'oil center', 'medical district'],
      aiStory: `Premier extended-stay anchor in Lafayette's Oil Center, blending the functionality of an apartment with the reliability of a professional hotel.`,
      aiTriggerConditions: {
        keywords: ['lafayette', 'extended stay', 'kitchen', 'suite', 'suites', 'acadiana'],
        location: 'lafayette',
      },
      uiThemeGlow: 'blue',
      isActive: true,
    };

    if (existing.length === 0) {
      await db.insert(featuredPartners).values(featuredPartnerData);
      console.log(`✅ Added Boardwalk Suites to featured_partners table`);
    } else {
      await db
        .update(featuredPartners)
        .set(featuredPartnerData)
        .where(eq(featuredPartners.googlePlaceId, BOARDWALK_SUITES.placeId));
      console.log(`✅ Updated featured_partners entry`);
    }
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      console.log(`⚠️  featured_partners table not found. Run migration: npm run db:push or run migrations/0002_business_data_tour_guide.sql`);
    } else {
      console.error(`⚠️  Failed to update featured_partners:`, error.message);
    }
  }

  const siteId = siteConfig[0].id;
  const cloudbedsApiKey = process.env.CLOUDBEDS_API_KEY;
  console.log(`\n🔗 Cloudbeds PMS integration (site ${siteId})...`);
  const existingPms = await db
    .select()
    .from(sitePmsIntegrations)
    .where(
      and(
        eq(sitePmsIntegrations.siteConfigId, siteId),
        eq(sitePmsIntegrations.pmsType, 'cloudbeds')
      )
    )
    .limit(1);
  if (cloudbedsApiKey) {
    if (existingPms.length > 0) {
      await db
        .update(sitePmsIntegrations)
        .set({
          propertyId: BOARDWALK_SUITES.cloudbedsPropertyId,
          apiKey: cloudbedsApiKey,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(sitePmsIntegrations.id, existingPms[0].id));
      console.log(`✅ Updated Cloudbeds integration (property ${BOARDWALK_SUITES.cloudbedsPropertyId})`);
    } else {
      await db.insert(sitePmsIntegrations).values({
        siteConfigId: siteId,
        pmsType: 'cloudbeds',
        propertyId: BOARDWALK_SUITES.cloudbedsPropertyId,
        apiKey: cloudbedsApiKey,
        isActive: true,
      });
      console.log(`✅ Created Cloudbeds integration (property ${BOARDWALK_SUITES.cloudbedsPropertyId})`);
    }
  } else {
    console.log(
      `⚠️  CLOUDBEDS_API_KEY not set; skip Cloudbeds. Add it in Doppler (aibizbot-clearvoice / dev). Service tokens (dp.st…) are scoped to dev — use: doppler configure set config dev && npm run setup:boardwalk`,
    );
  }

  return {
    siteConfigId: siteId,
    accountId,
    placeId: BOARDWALK_SUITES.placeId,
  };
}

async function setupBoardwalkSuites() {
  console.log('🏨 Setting up Boardwalk Suites Lafayette as Clear Voice Partner...\n');

  try {
    const r = await ensureBoardwalkPartnerSetup();
    console.log(`\n✅ Setup complete!`);
    console.log(`\n📋 Summary:`);
    console.log(`   - Customer Account: ${r.accountId}`);
    console.log(`   - Phone: ${normalizePhone(BOARDWALK_SUITES.owner.phone)}`);
    console.log(`   - Email: ${BOARDWALK_SUITES.owner.email}`);
    console.log(`   - Site Config: ${r.siteConfigId}`);
    console.log(`   - Place ID: ${r.placeId}`);
    console.log(`\n🔐 Admin Login:`);
    console.log(`   - Use phone ${normalizePhone(BOARDWALK_SUITES.owner.phone)} to login via OTP`);
    console.log(`   - Access admin dashboard from your website footer`);
    console.log(`\n⭐ Preferential Placement:`);
    console.log(`   - Boardwalk Suites will appear first for Lafayette hotel searches`);
    console.log(`   - Badge: "${BOARDWALK_SUITES.badgeLabel}"`);
    console.log(`   - Keywords: lafayette, extended stay, kitchen, suite, suites, acadiana`);
  } catch (error: any) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

if (isMainModule) {
  setupBoardwalkSuites()
    .then(() => {
      console.log('\n🎉 Boardwalk Suites Lafayette is now live as a Clear Voice Partner!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}
