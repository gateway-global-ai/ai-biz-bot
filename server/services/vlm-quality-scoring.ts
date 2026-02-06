import type { InsertVlmProspect } from "@shared/schema";

export class VlmQualityScoringService {
  calculateScore(prospect: InsertVlmProspect, targetCity?: string): number {
    let score = 0;

    if (prospect.phone) score += 30;
    if (prospect.email) score += 25;
    if (prospect.website) score += 20;

    if (prospect.address && prospect.city && prospect.state && prospect.postalCode) {
      score += 15;
    } else if (prospect.city && prospect.state) {
      score += 10;
    } else if (prospect.address) {
      score += 5;
    }

    if (targetCity && prospect.city) {
      const normalizedTarget = targetCity.toLowerCase().trim();
      const normalizedProspect = prospect.city.toLowerCase().trim();
      if (normalizedProspect.includes(normalizedTarget) || normalizedTarget.includes(normalizedProspect)) {
        score += 10;
      }
    }

    if (prospect.rating) {
      const rating = typeof prospect.rating === 'string' ? parseFloat(prospect.rating) : prospect.rating;
      if (!isNaN(rating)) score += Math.round((rating / 5) * 15);
    }

    if (prospect.reviewCount) {
      if (prospect.reviewCount >= 100) score += 15;
      else if (prospect.reviewCount >= 50) score += 12;
      else if (prospect.reviewCount >= 20) score += 8;
      else if (prospect.reviewCount >= 10) score += 5;
      else if (prospect.reviewCount >= 3) score += 2;
    }

    return Math.min(score, 100);
  }

  scoreProspects(prospects: InsertVlmProspect[], targetCity?: string): InsertVlmProspect[] {
    return prospects.map((p) => ({ ...p, qualityScore: this.calculateScore(p, targetCity) }));
  }

  sortByQuality(prospects: InsertVlmProspect[]): InsertVlmProspect[] {
    return [...prospects].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }
}
