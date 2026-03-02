import { Router, type Request, type Response } from "express";

const router = Router();

const EIN_REGEX = /^\d{2}-\d{7}$/;
const E164_PHONE_REGEX = /^\+1\d{10}$/;
const PO_BOX_PATTERN = /^P\.?O\.?\s*Box/i;

export interface PreFlightValidateBody {
  ein?: string;
  businessName?: string;
  websiteUrl?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactPhone?: string;
}

export interface PreFlightValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateA2PPreFlight(input: PreFlightValidateBody): PreFlightValidationResult {
  const errors: Record<string, string> = {};

  if (input.ein !== undefined && input.ein !== null) {
    if (!EIN_REGEX.test(String(input.ein).trim())) {
      errors.ein = "EIN must be in format XX-XXXXXXX";
    }
  }

  if (!String(input.streetAddress ?? "").trim()) {
    errors.streetAddress = "Street address is required";
  }
  if (!String(input.city ?? "").trim()) {
    errors.city = "City is required";
  }
  if (!String(input.state ?? "").trim()) {
    errors.state = "State is required";
  }
  if (!String(input.postalCode ?? "").trim()) {
    errors.postalCode = "Postal code is required";
  }
  if (input.streetAddress && PO_BOX_PATTERN.test(String(input.streetAddress))) {
    errors.streetAddress =
      "P.O. Box not accepted — TCR requires a physical street address";
  }

  if (
    input.contactPhone !== undefined &&
    input.contactPhone !== null &&
    String(input.contactPhone).trim() !== ""
  ) {
    if (!E164_PHONE_REGEX.test(String(input.contactPhone).trim())) {
      errors.contactPhone = "Phone must be E.164 format (+1XXXXXXXXXX)";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

router.post("/validate", async (req: Request, res: Response) => {
  try {
    const body = req.body as PreFlightValidateBody;
    const result = validateA2PPreFlight(body);

    if (body.websiteUrl && result.valid) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const siteRes = await fetch(body.websiteUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "GatewayGlobal-A2P-Preflight/1.0" },
        });
        clearTimeout(timeout);
        const html = await siteRes.text();
        const hasPrivacy = /privacy/i.test(html);
        const hasTerms = /terms/i.test(html);
        if (!hasPrivacy) {
          result.valid = false;
          result.errors.websiteUrl =
            (result.errors.websiteUrl ?? "") +
            (result.errors.websiteUrl ? "; " : "") +
            "Privacy policy not detected on website";
        }
        if (!hasTerms) {
          result.valid = false;
          result.errors.websiteUrl =
            (result.errors.websiteUrl ?? "") +
            (result.errors.websiteUrl ? "; " : "") +
            "Terms of service not detected";
        }
      } catch {
        result.valid = false;
        result.errors.websiteUrl =
          "Website could not be reached — must be publicly accessible";
      }
    }

    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({
      valid: false,
      errors: { _: err instanceof Error ? err.message : "Validation failed" },
    });
  }
});

router.get("/check-website", async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url) {
    return res.status(400).json({
      ok: false,
      hasPrivacy: false,
      hasTerms: false,
      error: "Missing url query parameter",
    });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const siteRes = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GatewayGlobal-A2P-Preflight/1.0" },
    });
    clearTimeout(timeout);
    const html = await siteRes.text();
    const hasPrivacy = /privacy/i.test(html);
    const hasTerms = /terms/i.test(html);
    res.json({
      ok: true,
      hasPrivacy,
      hasTerms,
      error: null,
    });
  } catch {
    res.status(200).json({
      ok: false,
      hasPrivacy: false,
      hasTerms: false,
      error: "Website could not be reached",
    });
  }
});

export default router;
