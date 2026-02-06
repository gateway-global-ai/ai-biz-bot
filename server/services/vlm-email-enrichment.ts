import * as cheerio from "cheerio";

export class VlmEmailEnrichmentService {
  private userAgent = "Mozilla/5.0 (compatible; GatewayAIBot/1.0)";

  async findEmailFromWebsite(websiteUrl: string): Promise<string | null> {
    if (!websiteUrl) return null;

    try {
      const canCrawl = await this.checkRobotsTxt(websiteUrl);
      if (!canCrawl) return null;

      const html = await this.fetchPage(websiteUrl);
      if (!html) return null;

      let email = this.extractEmail(html);
      if (email) return email;

      const contactUrl = this.findContactPageUrl(html, websiteUrl);
      if (contactUrl) {
        const contactHtml = await this.fetchPage(contactUrl);
        if (contactHtml) {
          email = this.extractEmail(contactHtml);
          if (email) return email;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async checkRobotsTxt(websiteUrl: string): Promise<boolean> {
    try {
      const url = new URL(websiteUrl);
      const response = await fetch(`${url.protocol}//${url.host}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": this.userAgent },
      });
      if (response.status === 404) return true;
      const text = await response.text();
      const lines = text.split("\n");
      let isOurAgent = false;
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith("user-agent:")) {
          isOurAgent = trimmed.split(":")[1].trim() === "*";
        }
        if (isOurAgent && trimmed === "disallow: /") return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": this.userAgent, Accept: "text/html" },
        redirect: "follow",
      });
      return await response.text();
    } catch {
      return null;
    }
  }

  private extractEmail(html: string): string | null {
    const $ = cheerio.load(html);
    const mailtoLinks = $('a[href^="mailto:"]');
    if (mailtoLinks.length > 0) {
      const href = $(mailtoLinks[0]).attr("href");
      if (href) {
        const email = href.replace("mailto:", "").split("?")[0].trim();
        if (this.isValidEmail(email)) return email;
      }
    }
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = $.text().match(emailRegex);
    if (matches) {
      const valid = matches.find(
        (e) => !e.includes("example.com") && !e.includes("yourdomain.com") && !e.includes("test@") && this.isValidEmail(e)
      );
      if (valid) return valid.toLowerCase();
    }
    return null;
  }

  private findContactPageUrl(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);
    const keywords = ["contact", "about", "reach-us", "get-in-touch"];
    const links = $("a");
    for (let i = 0; i < links.length; i++) {
      const href = $(links[i]).attr("href");
      const text = $(links[i]).text().toLowerCase();
      if (href && keywords.some((kw) => text.includes(kw) || href.includes(kw))) {
        return this.resolveUrl(href, baseUrl);
      }
    }
    return null;
  }

  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith("http")) return href;
    const base = new URL(baseUrl);
    return href.startsWith("/") ? `${base.protocol}//${base.host}${href}` : `${baseUrl}/${href}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async enrichProspects(prospects: any[]): Promise<any[]> {
    const enriched = [];
    for (const prospect of prospects) {
      const p = { ...prospect };
      if (prospect.website && !prospect.email) {
        const email = await this.findEmailFromWebsite(prospect.website);
        if (email) p.email = email;
      }
      enriched.push(p);
    }
    return enriched;
  }
}
