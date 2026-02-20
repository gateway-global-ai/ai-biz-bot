/**
 * Test script for Hotel MCP Server
 * Tests database connection and API endpoints
 */

import pg from "pg";
import axios from "axios";

const config = {
  database: {
    host: "88.198.6.114",
    port: 38164,
    database: "static_master",
    user: "reporting",
    password: process.env.GRN_STATIC_KEY || "Ghab%j2jK231"
  },
  grn: {
    apiKey: process.env.GRN_API_KEY || "7438238a97854f59a51d19f36de24625",
    endpoint: "https://sandbox-hub-neworbit.grnconnect.com/api/v3/hotels/availability/"
  },
  serp: {
    apiKey: process.env.SERPAPI_KEY || ""
  }
};

async function testDatabaseConnection() {
  console.log("\n=== Testing Database Connection ===");
  const pool = new pg.Pool(config.database);

  try {
    // Test basic connection
    const result = await pool.query("SELECT 1 as test");
    console.log("✅ Database connection successful");

    // Test hotel table
    const hotels = await pool.query(`
      SELECT COUNT(*) as count FROM hotel LIMIT 1
    `);
    console.log(`✅ Hotel table accessible - ${hotels.rows[0].count} hotels found`);

    // Sample hotel query
    const sampleHotels = await pool.query(`
      SELECT h.grn_hotel_id, h.giata_hotel_id, h.hotel_name, h.giata_city_name as city
      FROM hotel h
      WHERE h.giata_city_name IS NOT NULL
      LIMIT 5
    `);
    console.log("\nSample hotels:");
    sampleHotels.rows.forEach(h => {
      console.log(`  - ${h.grn_hotel_id} (giata: ${h.giata_hotel_id}): ${h.hotel_name} (${h.city})`);
    });

    return true;
  } catch (error) {
    console.log("❌ Database connection failed:", error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function testGrnApi() {
  console.log("\n=== Testing GRN Connect API ===");

  // Get a hotel code from the database first
  const pool = new pg.Pool(config.database);
  let hotelCode = "1848061"; // Default fallback (Dubai hotel from sample)

  try {
    const result = await pool.query(`
      SELECT giata_hotel_id FROM hotel WHERE giata_hotel_id IS NOT NULL LIMIT 1
    `);
    if (result.rows.length > 0) {
      hotelCode = result.rows[0].giata_hotel_id;
    }
    await pool.end();
  } catch (e) {
    console.log("Using default hotel code for API test");
  }

  // Calculate dates (tomorrow and day after)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  const checkout = new Date(tomorrow);
  checkout.setDate(checkout.getDate() + 1);

  const checkin = tomorrow.toISOString().split("T")[0];
  const checkoutStr = checkout.toISOString().split("T")[0];

  console.log(`Testing with hotel: ${hotelCode}`);
  console.log(`Dates: ${checkin} to ${checkoutStr}`);

  try {
    const response = await axios.post(
      config.grn.endpoint,
      {
        hotel_codes: [hotelCode],
        checkin: checkin,
        checkout: checkoutStr,
        client_nationality: "US",
        currency: "USD",
        rates: "concise",
        cutoff_time: 8000,
        rooms: [{ adults: "2" }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": config.grn.apiKey,
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );

    if (response.data.errors) {
      console.log("⚠️ API returned errors:", response.data.errors);
    } else if (response.data.hotels && response.data.hotels.length > 0) {
      console.log("✅ GRN API working - received hotel availability");
      const hotel = response.data.hotels[0];
      console.log(`  Hotel: ${hotel.name}`);
      if (hotel.min_rate) {
        console.log(`  Min Rate: ${hotel.min_rate.price} ${hotel.min_rate.currency}`);
      }
    } else {
      console.log("⚠️ API returned no hotels (may be no availability for these dates)");
      console.log("  Response:", JSON.stringify(response.data).substring(0, 200));
    }

    return true;
  } catch (error) {
    console.log("❌ GRN API test failed:", error.message);
    if (error.response) {
      console.log("  Status:", error.response.status);
      console.log("  Data:", JSON.stringify(error.response.data).substring(0, 200));
    }
    return false;
  }
}

async function testSerpApi() {
  console.log("\n=== Testing SERP API ===");
  const apiKey = config.serp.apiKey || process.env.SERPAPI_KEY || process.env.SERP_API_KEY;

  if (!apiKey) {
    console.log("⚠️ SERPAPI_KEY not set - skipping test");
    console.log("  Set SERPAPI_KEY environment variable to test reviews");
    return false;
  }

  try {
    // Note: SERP API doesn't allow 'num' on initial page without query/next_page_token
    const response = await axios.get("https://serpapi.com/search", {
      params: {
        engine: "google_maps_reviews",
        api_key: apiKey,
        place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4" // Sample Sydney Opera House
      },
      timeout: 10000
    });

    if (response.data.reviews) {
      console.log("✅ SERP API working");
      console.log(`  Found ${response.data.reviews.length} reviews`);
    }
    return true;
  } catch (error) {
    console.log("❌ SERP API test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("Hotel MCP Server - Component Tests");
  console.log("===================================");

  const dbOk = await testDatabaseConnection();
  const grnOk = await testGrnApi();
  const serpOk = await testSerpApi();

  console.log("\n=== Summary ===");
  console.log(`Database: ${dbOk ? "✅" : "❌"}`);
  console.log(`GRN API:  ${grnOk ? "✅" : "❌"}`);
  console.log(`SERP API: ${serpOk ? "✅" : "⚠️ (key not set)"}`);

  if (!dbOk || !grnOk) {
    console.log("\n⚠️ Some core components failed. Check credentials and network.");
  } else {
    console.log("\n✅ Core components working! Server ready to run.");
  }
}

main().catch(console.error);
