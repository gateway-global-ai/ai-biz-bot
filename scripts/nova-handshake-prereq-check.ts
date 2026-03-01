/**
 * Nova Handshake prereq check: run with doppler run to see which required env vars are missing.
 * Usage: doppler run -- npx tsx scripts/nova-handshake-prereq-check.ts
 */

const REQUIRED = [
  "DATABASE_URL",
  "NOVA_RSA_PUBLIC_KEY",
  "NOVA_RSA_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "PLATFORM_SENDER_EMAIL",
] as const;

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3004";

function main() {
  const missing: string[] = [];
  const present: string[] = [];
  for (const name of REQUIRED) {
    const v = process.env[name];
    if (v?.trim()) present.push(name);
    else missing.push(name);
  }

  console.log("Nova Handshake — Prereq Check\n");
  if (missing.length) {
    console.log("Missing in Doppler (add these to your Doppler project/config):");
    missing.forEach((n) => console.log("  -", n));
    if (missing.includes("NOVA_RSA_PUBLIC_KEY") || missing.includes("NOVA_RSA_PRIVATE_KEY")) {
      console.log("\nTo generate Nova RSA keys run: ./scripts/generate-nova-keys.sh");
    }
    console.log("\nThen run: npm run test:nova-handshake");
    process.exit(1);
  }
  console.log("All required env vars are set.");
  console.log("Server check: ensure app is running (doppler run -- npm run dev) and BASE_URL=" + BASE_URL);
  console.log("Run handshake: npm run test:nova-handshake");
  process.exit(0);
}

main();
