/**
 * Evaluates social crawler OG tags for `/biz/:slug` — same merge rules as `server/routes.ts`
 * crawler middleware (keep in sync when that block changes).
 */

export type SocialOgIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

function getPlatformDefaultOg(): { ogTitle: string; ogImage: string; ogDescription: string; ogSiteName: string } {
  const baseUrl = (process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai").replace(/\/$/, "");
  return {
    ogTitle: "Sovereign AI OS — Voice-first, governed, deterministic agents",
    ogDescription:
      "Gateway Global AI is the AI Business Router: Clear Voice PTT, registry-backed tools, execution-plane integrity, and operator-grade governance for mid-market operators.",
    ogImage: `${baseUrl}/og-preview.png`,
    ogSiteName: "Gateway Global AI",
  };
}

function imageAbs(baseUrl: string, url: string): string {
  return url && url.startsWith("http") ? url : `${baseUrl}${url?.startsWith("/") ? "" : "/"}${url || ""}`;
}

export type SiteForOgReadiness = {
  name: string | null;
  slug: string | null;
  heroImageUrl?: string | null;
  socialSharing?: Record<string, string> | null;
  placeData?: unknown;
};

/**
 * @param baseUrl — e.g. `https://host` (same construction as crawler middleware)
 */
export function assessBizPageOgReadiness(site: SiteForOgReadiness, baseUrl: string): {
  publicBizUrl: string | null;
  effectiveOg: {
    ogTitle: string;
    ogDescription: string;
    ogUrl: string;
    ogImage: string;
    ogSiteName: string;
  };
  issues: SocialOgIssue[];
  planningChecklist: string[];
} {
  const platform = getPlatformDefaultOg();
  const issues: SocialOgIssue[] = [];
  const planningChecklist = [
    "Include OG title, description, and 1200×630 image in launch planning — not post-launch.",
    "Any URL used as a share container (public /biz page, campaign links) must pass this check before go-live.",
    "Prefer HTTPS image URLs; avoid URL shorteners in shared links (spam filters + stale redirects).",
  ];

  const slug = site.slug?.trim() || null;
  if (!slug) {
    issues.push({
      level: "error",
      code: "no_slug",
      message: "No public slug — /biz/… links cannot resolve; set slug before sharing.",
    });
  }

  const placeData = site.placeData as
    | { editorial_summary?: string | { overview?: string }; name?: string }
    | undefined;
  const summary =
    placeData?.editorial_summary && typeof placeData.editorial_summary === "object"
      ? (placeData.editorial_summary as { overview?: string }).overview
      : (placeData?.editorial_summary as string | undefined);

  const stored = site.socialSharing || {};
  const heroUrl = site.heroImageUrl || undefined;

  const ogTitle = stored.ogTitle ?? site.name ?? platform.ogTitle;
  const ogDescription =
    stored.ogDescription ??
    summary ??
    (site.name ? `Visit ${site.name} — voice-first concierge on the Sovereign AI OS.` : platform.ogDescription);
  const ogUrl = stored.ogUrl ?? (slug ? `${baseUrl}/biz/${slug}` : baseUrl);
  const ogImage = stored.ogImage
    ? imageAbs(baseUrl, stored.ogImage)
    : heroUrl
      ? imageAbs(baseUrl, heroUrl)
      : platform.ogImage;
  const ogSiteName = stored.ogSiteName ?? site.name ?? platform.ogSiteName;

  const isPlatformPreviewImage =
    ogImage === platform.ogImage || ogImage.includes("/og-preview.png");

  if (isPlatformPreviewImage) {
    issues.push({
      level: "warning",
      code: "platform_og_image",
      message:
        "Link preview image is still the platform default — set OG Image URL or Hero image (owner Social Sharing) so shares look like your brand, not plain text.",
    });
  }

  return {
    publicBizUrl: slug ? `${baseUrl}/biz/${slug}` : null,
    effectiveOg: { ogTitle, ogDescription, ogUrl, ogImage, ogSiteName },
    issues,
    planningChecklist,
  };
}
