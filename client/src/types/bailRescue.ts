/** Public-safe shape of a BailRescueSession (no internal IDs) */
export interface BailRescueSessionPublic {
  token: string;
  createdAt: string;
  expiresAt: string;
  inmateFirstName: string;
  inmateLastName: string;
  facilityName: string;
  facilityPhone: string | null;
  custodyStatus: "confirmed" | "pending_verification" | "not_found";
  bondAmount: number | null;
  premiumCents: number | null;
  premiumDisplay: string | null;
  outsideContactNumber: string;
  businessName: string;
  ownerName: string;
  agencyContact: string;
  stripeCheckoutUrl: string | null;
  paymentStatus: "pending" | "paid" | "failed";
}
