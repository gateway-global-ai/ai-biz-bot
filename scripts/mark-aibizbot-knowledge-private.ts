import { storage } from "../server/storage";

const TARGET_SITE_SLUG = process.env.TARGET_SITE_SLUG?.trim() || "ai-biz-bots";

async function main() {
  const site = await storage.getSiteConfigBySlug(TARGET_SITE_SLUG);
  if (!site) {
    console.error(`Target site not found for slug: ${TARGET_SITE_SLUG}`);
    process.exit(1);
  }

  const existing = Array.isArray((site as any).knowledgeLibrary)
    ? ([...(site as any).knowledgeLibrary] as any[])
    : [];

  let changed = 0;

  const next = existing.map((doc) => {
    const sourcePath = typeof doc?.sourcePath === "string" ? doc.sourcePath : "";
    const shouldLock =
      sourcePath.includes("/user_uploads/") ||
      sourcePath.includes("\\user_uploads\\");

    if (!shouldLock) {
      return doc;
    }

    if (doc.visibility === "private") {
      return doc;
    }

    changed += 1;
    return {
      ...doc,
      visibility: "private",
    };
  });

  if (changed === 0) {
    console.log("No knowledge documents needed privacy updates.");
    return;
  }

  await storage.updateSiteConfig(site.id, { knowledgeLibrary: next } as any);
  console.log(
    `Updated ${changed} knowledge document(s) to visibility=private for site slug "${TARGET_SITE_SLUG}".`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
