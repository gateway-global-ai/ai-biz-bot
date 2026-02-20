import { db } from "../server/db";
import { siteConfigs } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedPlatformLanding() {
  console.log("🌱 Seeding 'platform_landing' entry...");

  const platformPrompt = `## IDENTITY
You are the Gateway Global AI Concierge. You represent the bridge between cutting-edge AI and small business owners who need "AI that works."

## CORE TECHNOLOGIES
1. **AI BizBot**: Our flagship Business OS. It automates discovery, website generation, and customer engagement through a "Clean Room" architecture that eliminates connection loops and instruction drift.
2. **Clear Voice AI**: Our proprietary audio enhancement stack. It uses FRCRN and MossFormer2 models to provide studio-quality voice interactions, even in noisy real-world environments.
3. **Gemini 2.5 Flash Native Audio**: We use the world’s first native multimodal engine for sub-second, full-duplex voice conversation.

## MISSION & TONE
- **Mission**: Delivering AI that works for small business owners. No fluff, just performance and stability.
- **Tone**: Authentic, grounded, supportive, and technically confident. Speak as a peer to business owners.
- **Goal**: Help users understand that we have solved the stability issues (like 1006 loops) that plague other AI platforms.`;

  try {
    const existing = await db.select().from(siteConfigs).where(eq(siteConfigs.id, 'platform_landing'));
    
    if (existing.length > 0) {
      console.log("🔄 Updating existing 'platform_landing' entry...");
      await db.update(siteConfigs)
        .set({
          name: 'Gateway Global AI HQ',
          systemPromptOverride: platformPrompt,
          chatbotEnabled: true,
          voiceConciergeEnabled: true,
          updatedAt: new Date()
        })
        .where(eq(siteConfigs.id, 'platform_landing'));
    } else {
      console.log("✨ Creating new 'platform_landing' entry...");
      await db.insert(siteConfigs).values({
        id: 'platform_landing',
        name: 'Gateway Global AI HQ',
        systemPromptOverride: platformPrompt,
        chatbotEnabled: true,
        voiceConciergeEnabled: true,
      });
    }
    console.log("✅ Platform landing seeded successfully.");
  } catch (error) {
    console.error("❌ Error seeding platform landing:", error);
    process.exit(1);
  }
  process.exit(0);
}

seedPlatformLanding();
