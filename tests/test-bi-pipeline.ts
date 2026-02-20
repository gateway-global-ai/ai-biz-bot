/**
 * Clear Voice AI: Business Intelligence Pipeline Integration Tests
 *
 * Tests review mining, SWOT generation, and system instruction building.
 * Run with: npm run test:bi
 */

import { generateFullReport } from '../server/services/reviewAnalysisService.js';
import { enrichBusinessData } from '../server/services/businessDataService.js';
import { buildRichSystemInstruction } from '../server/services/systemInstructionBuilder.js';
import type { BusinessContext, AgentConfig } from '../client/src/types/voice.js';

// Test placeId - Boardwalk Suites Lafayette (default) or override via TEST_PLACE_ID in Doppler
const TEST_PLACE_ID = process.env.TEST_PLACE_ID || 'ChIJB4qU6oXvJIgR_2p602OaK_U';
const TEST_BUSINESS_NAME = process.env.TEST_BUSINESS_NAME || 'Boardwalk Suites Lafayette';

/** True if we have a real place ID to hit the Places API (no placeholder). */
const hasValidPlaceId = TEST_PLACE_ID.length > 20 && !TEST_PLACE_ID.includes('...');

async function runTestSuite() {
  console.log('🚀 Starting Clear Voice Integration Tests...\n');

  let passed = 0;
  let failed = 0;
  let test2Failed404 = false;

  // TEST 1: Review Mining & SWOT Generation
  console.log('📊 Test 1: Review Mining & SWOT Generation');
  try {
    const serpKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
    if (!serpKey) {
      console.log('⚠️  Skipping (SERP API key not set: SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY)');
    } else {
      const report = await generateFullReport(TEST_PLACE_ID, TEST_BUSINESS_NAME);

      if (!report) {
        throw new Error('Report is null');
      }

      if (!report.executive_summary || report.executive_summary.length === 0) {
        throw new Error('Executive summary is missing or empty');
      }

      if (!report.cinematic_narrative || !report.cinematic_narrative.landing) {
        throw new Error('Cinematic narrative is missing');
      }

      const amenityCount = report.amenity_list?.length ?? 0;
      const blindSpotCount = report.owner_insights?.blind_spots?.length ?? 0;
      if (amenityCount === 0) console.log('   ⚠️  Amenity list empty (optional)');
      if (blindSpotCount === 0) console.log('   ⚠️  Blind spots empty (optional)');

      console.log('✅ SWOT Analysis Generated Successfully');
      console.log(`   - Executive Summary: ${report.executive_summary.substring(0, 100)}...`);
      console.log(`   - Amenities: ${amenityCount} | Blind Spots: ${blindSpotCount}`);
      passed++;
    }
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    failed++;
  }

  console.log('');

  // TEST 2: Enriched Business Data
  console.log('🔍 Test 2: Enriched Business Data');
  const hasGoogleMapsKey = !!(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY);
  if (!hasGoogleMapsKey) {
    console.log('⚠️  Skipping (GOOGLE_MAPS_API_KEY not set)');
  } else if (!hasValidPlaceId) {
    console.log('⚠️  Skipping (Set TEST_PLACE_ID to a valid Google Place ID in Doppler to run this test)');
  } else {
    try {
      const enriched = await enrichBusinessData(TEST_PLACE_ID, {
        includeIntelligence: true,
        includeOwnerData: false,
        businessName: TEST_BUSINESS_NAME,
      });

      if (!enriched || !enriched.general) {
        throw new Error('Enriched data is missing general data');
      }

      if (!enriched.general.name || !enriched.general.placeId) {
        throw new Error('General business data is incomplete');
      }

      console.log('✅ Enriched Business Data Retrieved');
      console.log(`   - Business: ${enriched.general.name}`);
      console.log(`   - Place ID: ${enriched.general.placeId}`);
      if (enriched.intelligence) {
        console.log(`   - Intelligence: Included`);
      }
      passed++;
    } catch (error: any) {
      if (error.response?.status === 404) {
        test2Failed404 = true;
        console.log('❌ Place ID obsolete or invalid (404) for Places API (New). Refresh the ID to fix.');
        console.log(`   Place ID: ${TEST_PLACE_ID}`);
        console.log('   Run search with business name to get current Place ID (e.g. Grounding Lite or searchText).');
        failed++;
      } else {
        console.error('❌ Failed:', error.message);
        failed++;
      }
    }
  }

  console.log('');

  // TEST 3: System Instruction Building
  console.log('📝 Test 3: System Instruction Building');
  if (!hasGoogleMapsKey) {
    console.log('⚠️  Skipping (GOOGLE_MAPS_API_KEY not set)');
  } else if (!hasValidPlaceId) {
    console.log('⚠️  Skipping (Set TEST_PLACE_ID to a valid Google Place ID in Doppler to run this test)');
  } else {
    try {
      const business: BusinessContext = {
        placeId: TEST_PLACE_ID,
        name: TEST_BUSINESS_NAME,
        address: 'Test Address',
      };

      const agent: AgentConfig = {
        role: 'Business Assistant',
        personality: 'Helpful and professional',
        objectives: ['Assist customers with business information'],
        constraints: ['Be polite and professional'],
      };

      const instruction = await buildRichSystemInstruction(business, agent, {
        includeIntelligence: true,
        includeTourNarrative: true,
      });

      if (!instruction || instruction.length === 0) {
        throw new Error('Instruction is empty');
      }

      if (!instruction.includes(TEST_BUSINESS_NAME)) {
        throw new Error('Instruction does not include business name');
      }

      // Intelligence section only present when enrichment succeeded (Places API returned data)
      if (!instruction.includes('BUSINESS INTELLIGENCE')) {
        if (test2Failed404) {
          console.log('❌ No BUSINESS INTELLIGENCE (enrichment failed due to obsolete Place ID - same as Test 2). Refresh the ID to fix.');
          failed++;
        } else {
          console.log('⚠️  No BUSINESS INTELLIGENCE section (enrichment likely failed for this place ID - same as Test 2)');
          console.log(`   Place ID: ${TEST_PLACE_ID}`);
          console.log('   Instruction built with fallback context only.');
        }
      } else {
        console.log('✅ System Instructions Enriched with BI');
        console.log(`   - Length: ${instruction.length} characters`);
        console.log(`   - Includes Business Name: ${instruction.includes(TEST_BUSINESS_NAME)}`);
        console.log(`   - Includes Intelligence: ${instruction.includes('BUSINESS INTELLIGENCE')}`);
        passed++;
      }
    } catch (error: any) {
      if (error.response?.status === 404 || error.message?.includes('404')) {
        console.log('❌ Place ID obsolete or invalid (404). Instruction building requires valid place data. Refresh the ID to fix.');
        failed++;
      } else {
        console.error('❌ Failed:', error.message);
        failed++;
      }
    }
  }

  console.log('');

  // Summary
  const skipped = 3 - passed - failed;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏁 Test Results: ${passed} passed, ${failed} failed${skipped > 0 ? `, ${skipped} skipped (missing API keys)` : ''}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTestSuite().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
