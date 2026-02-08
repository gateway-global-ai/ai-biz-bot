import { createObjectCsvWriter } from "csv-writer";
import type { VlmProspect } from "@shared/schema";
import { promises as fs } from "fs";
import path from "path";

export class VlmCsvExportService {
  private outputDir = path.join(process.cwd(), "vlm-output");

  async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async exportProspects(prospects: VlmProspect[]): Promise<{ filePath: string; count: number }> {
    await this.ensureDirectory();

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `prospects_${dateStr}.csv`;
    const filePath = path.join(this.outputDir, filename);

    const rows = prospects.map((p) => ({
      name: p.businessName,
      phone: p.phone || "",
      email: p.email || "",
      website: p.website || "",
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      zip: p.postalCode || "",
      industry: p.industry,
      quality_score: p.qualityScore,
      rating: p.rating || "",
      review_count: p.reviewCount || "",
      status: p.status,
      google_place_id: p.googlePlaceId || "",
    }));

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "name", title: "Business Name" },
        { id: "phone", title: "Phone" },
        { id: "email", title: "Email" },
        { id: "website", title: "Website" },
        { id: "address", title: "Address" },
        { id: "city", title: "City" },
        { id: "state", title: "State" },
        { id: "zip", title: "Zip" },
        { id: "industry", title: "Industry" },
        { id: "quality_score", title: "Quality Score" },
        { id: "rating", title: "Rating" },
        { id: "review_count", title: "Reviews" },
        { id: "status", title: "Status" },
        { id: "google_place_id", title: "Google Place ID" },
      ],
    });

    await csvWriter.writeRecords(rows);
    return { filePath, count: prospects.length };
  }
}
