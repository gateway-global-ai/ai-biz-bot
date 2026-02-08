import * as cheerio from "cheerio";

export interface WebsiteQualityReport {
  score: number;
  factors: {
    hasHttps: boolean;
    isMobileResponsive: boolean;
    hasSeoMetaTags: boolean;
    hasContactInfo: boolean;
    usesModernHtml: boolean;
    hasStructuredData: boolean;
    hasProfessionalImages: boolean;
    isFastLoading: boolean;
    hasCleanDesign: boolean;
  };
  details: {
    protocol: string;
    hasViewport: boolean;
    hasTitle: boolean;
    hasDescription: boolean;
    hasContactPhone: boolean;
    hasContactEmail: boolean;
    semanticTagsCount: number;
    schemaOrgTypes: string[];
    imageCount: number;
    imagesWithAlt: number;
    pageSizeKb: number;
    headingStructure: boolean;
  };
}

export class VlmWebsiteAnalyzerService {
  async analyzeWebsite(url: string): Promise<WebsiteQualityReport> {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GatewayAIBot/1.0)" },
        redirect: "follow",
      });
      const html = await response.text();
      const loadTime = Date.now() - startTime;
      const pageSizeKb = Buffer.byteLength(html, "utf8") / 1024;
      const $ = cheerio.load(html);
      const parsedUrl = new URL(url);

      const details = {
        protocol: parsedUrl.protocol,
        hasViewport: false, hasTitle: false, hasDescription: false,
        hasContactPhone: false, hasContactEmail: false,
        semanticTagsCount: 0, schemaOrgTypes: [] as string[],
        imageCount: 0, imagesWithAlt: 0, pageSizeKb, headingStructure: false,
      };

      const hasHttps = parsedUrl.protocol === "https:";
      const viewportMeta = $('meta[name="viewport"]').attr("content");
      details.hasViewport = !!viewportMeta && viewportMeta.includes("width=device-width");
      const isMobileResponsive = details.hasViewport;

      const title = $("title").text().trim();
      details.hasTitle = title.length > 0 && title.length < 70;
      const description = $('meta[name="description"]').attr("content");
      details.hasDescription = !!description && description.length > 50 && description.length < 160;
      const hasSeoMetaTags = details.hasTitle && details.hasDescription;

      const bodyText = $("body").text().toLowerCase();
      details.hasContactPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText) || $('a[href^="tel:"]').length > 0;
      details.hasContactEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(bodyText) || $('a[href^="mailto:"]').length > 0;
      const hasContactInfo = details.hasContactPhone && details.hasContactEmail;

      const semanticTags = ["header", "nav", "main", "article", "section", "aside", "footer"];
      details.semanticTagsCount = semanticTags.reduce((c, t) => c + $(t).length, 0);
      const usesModernHtml = details.semanticTagsCount >= 3;

      const jsonLdScripts = $('script[type="application/ld+json"]');
      jsonLdScripts.each((_, elem) => {
        try {
          const data = JSON.parse($(elem).html() || "");
          if (data["@type"]) details.schemaOrgTypes.push(data["@type"]);
        } catch {}
      });
      const hasStructuredData = details.schemaOrgTypes.length > 0;

      const images = $("img");
      details.imageCount = images.length;
      details.imagesWithAlt = images.filter((_, img) => !!$(img).attr("alt")).length;
      const hasProfessionalImages = details.imageCount >= 3 && details.imagesWithAlt / details.imageCount >= 0.7;

      const isFastLoading = pageSizeKb < 500 && loadTime < 3000;

      details.headingStructure = $("h1").length === 1 && $("h2").length >= 2;
      const hasCleanDesign = details.headingStructure && details.imageCount > 0;

      const factors = { hasHttps, isMobileResponsive, hasSeoMetaTags, hasContactInfo, usesModernHtml, hasStructuredData, hasProfessionalImages, isFastLoading, hasCleanDesign };
      const score = (hasHttps ? 10 : 0) + (isMobileResponsive ? 15 : 0) + (hasSeoMetaTags ? 15 : 0) + (hasContactInfo ? 15 : 0) + (usesModernHtml ? 10 : 0) + (hasStructuredData ? 10 : 0) + (hasProfessionalImages ? 10 : 0) + (isFastLoading ? 5 : 0) + (hasCleanDesign ? 10 : 0);

      return { score, factors, details };
    } catch (error: any) {
      return {
        score: 0,
        factors: { hasHttps: false, isMobileResponsive: false, hasSeoMetaTags: false, hasContactInfo: false, usesModernHtml: false, hasStructuredData: false, hasProfessionalImages: false, isFastLoading: false, hasCleanDesign: false },
        details: { protocol: "unknown", hasViewport: false, hasTitle: false, hasDescription: false, hasContactPhone: false, hasContactEmail: false, semanticTagsCount: 0, schemaOrgTypes: [], imageCount: 0, imagesWithAlt: 0, pageSizeKb: 0, headingStructure: false },
      };
    }
  }

  getGrade(score: number): string {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }
}
