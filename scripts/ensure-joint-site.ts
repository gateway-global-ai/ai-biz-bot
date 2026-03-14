
import { db } from "../server/db";
import { siteConfigs, users, agents } from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function ensureJointSite() {
  console.log("Checking for 'The Joint Chiropractic' site config...");

  const slug = "the-joint-chiropractic";
  const existingSite = await db.query.siteConfigs.findFirst({
    where: eq(siteConfigs.domain, slug),
  });

  if (existingSite) {
    console.log(`Site found: ${existingSite.name} (${existingSite.id})`);
    
    // Ensure it has an owner
    if (!existingSite.ownerId) {
        console.log("Site has no owner. Assigning default owner...");
        const defaultUser = await db.query.users.findFirst();
        if (defaultUser) {
            await db.update(siteConfigs)
                .set({ ownerId: defaultUser.id })
                .where(eq(siteConfigs.id, existingSite.id));
            console.log(`Assigned owner: ${defaultUser.username} (${defaultUser.id})`);
        } else {
            console.log("No default user found to assign as owner.");
        }
    }

    return;
  }

  console.log("Site not found. Creating...");

  // Get a default owner
  let ownerId = null;
  const defaultUser = await db.query.users.findFirst();
  if (defaultUser) {
    ownerId = defaultUser.id;
  }

  const newSiteId = "4e1f25ba-09f0-4a69-9914-ec29b073fb75"; // Use the UUID we've been using in hardcoded configs

  try {
    await db.insert(siteConfigs).values({
      id: newSiteId,
      name: "The Joint Chiropractic",
      domain: slug,
      ownerId: ownerId,
      chatbotEnabled: true,
      voiceConciergeEnabled: true,
      modelProvider: "gemini",
      greetingMessage: "Welcome to The Joint Chiropractic. How can I help you today?",
      placeholderText: "Ask about our wellness plans...",
      voiceConfig: {
        provider: "gemini",
        voiceName: "Puck",
        mode: "clear_voice",
        analysis: {
          detectEmotion: true,
          detectSentiment: true,
          detectDISC: true
        }
      },
      agentConfig: {
        name: "The Joint Receptionist",
        role: "Front Desk Receptionist",
        basePrompt: "You are the receptionist for The Joint Chiropractic. You help patients check in, verify their identity, and manage appointments.",
        objectives: ["Verify patient identity", "Check in patients", "Answer questions about plans"],
        constraints: ["Be polite and professional", "Verify identity before sharing account details"]
      },
      placeData: {
        name: "The Joint Chiropractic",
        formatted_address: "123 Wellness Way, Health City, CA 90210",
        formatted_phone_number: "(555) 123-4567",
        opening_hours: {
          weekday_text: [
            "Monday: 10:00 AM – 7:00 PM",
            "Tuesday: 10:00 AM – 7:00 PM",
            "Wednesday: 10:00 AM – 7:00 PM",
            "Thursday: 10:00 AM – 7:00 PM",
            "Friday: 10:00 AM – 7:00 PM",
            "Saturday: 10:00 AM – 4:00 PM",
            "Sunday: Closed"
          ]
        },
        types: ["chiropractor", "health", "point_of_interest"]
      }
    });

    console.log(`Created site: The Joint Chiropractic (${newSiteId})`);

    // Create the agent as well
    await db.insert(agents).values({
        id: randomUUID(),
        siteConfigId: newSiteId,
        name: "The Joint Receptionist",
        roleType: "receptionist",
        voiceId: "Puck",
        voiceName: "Puck",
        isActive: true,
        systemPrompt: "You are the receptionist for The Joint Chiropractic.",
        operationalMode: "RECEPTIONIST",
        structuredControls: {
            allowed_tools: ["kiosk_onboarding", "check_appointment"],
            escalation_path: "manager",
            refusal_behavior: "polite_decline"
        }
    });
    console.log("Created default agent for the site.");

  } catch (error) {
    console.error("Error creating site:", error);
  }
}

ensureJointSite().catch(console.error).finally(() => process.exit());
