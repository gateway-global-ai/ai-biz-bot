import type { BusinessCandidate } from "../../../shell/SharedCanvasProvider";

export function searchMockDatabase(args: {
  search_name: string;
  city?: string;
  state?: string;
  zip?: string;
}): BusinessCandidate[] {
  const baseName = args.search_name.trim() || "Business";

  return [
    {
      id: "candidate-1",
      business_name: `${baseName}`,
      city: args.city ?? "Lafayette",
      state: args.state ?? "LA",
      zip: args.zip ?? "70501",
      contact_email: "ops@example.com",
      category: "hospitality",
    },
    {
      id: "candidate-2",
      business_name: `${baseName} Holdings`,
      city: args.city ?? "Lafayette",
      state: args.state ?? "LA",
      zip: args.zip ?? "70508",
      contact_email: "admin@example.com",
      category: "services",
    },
    {
      id: "candidate-3",
      business_name: `${baseName} Group`,
      city: args.city ?? "Baton Rouge",
      state: args.state ?? "LA",
      zip: args.zip ?? "70802",
      contact_email: "team@example.com",
      category: "retail",
    },
  ];
}
