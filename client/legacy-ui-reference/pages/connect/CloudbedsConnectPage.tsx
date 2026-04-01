/**
 * VIEW_REGISTRY: `integration_connect_surface` — implements logical route `operator.integration.connect`.
 * Browser path `/connect/cloudbeds` is an adapter only; identity comes from GET /api/integration/connect/governance-context.
 * @see docs-governance/canonical/VIEW_REGISTRY.md
 * @see docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md
 */
import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import { BRAND, CANVAS, SHELL } from "@/config/brand";
import { SovereignPageShell } from "@/ui-core/layouts/SovereignPageShell";

type SurfaceResponse = {
  siteConfigId: string;
  vendorId: string;
  oauthStartPath: string;
  callbackUrl: string | null;
  clientIdConfigured: boolean;
  pms: {
    installPosture: string | null;
    authLane: string | null;
    propertyId: string | null;
    hasCredentials: boolean;
  } | null;
};

type HotelDetailsResponse =
  | { ok: true; hotel: Record<string, unknown> }
  | { ok: false; cloudbedsStatus?: number; hotel?: Record<string, unknown>; error?: string };

/** Server authority for this surface — must match VIEW_REGISTRY + integration connect routes. */
type GovernanceContextResponse = {
  logicalRouteId: string;
  viewId: string;
  specId: string;
  specVersion: string;
  browserAdapterPath: string;
  vendorId: string;
  session: { siteConfigId: string; vendorId: string; expiresAtEpochMs: number } | null;
};

async function fetchGovernanceContext(): Promise<
  { ok: true; ctx: GovernanceContextResponse } | { ok: false; message: string }
> {
  const r = await fetch("/api/integration/connect/governance-context", { credentials: "include" });
  let data: GovernanceContextResponse & { error?: string };
  try {
    data = (await r.json()) as GovernanceContextResponse & { error?: string };
  } catch {
    return { ok: false, message: r.statusText || "Invalid governance response" };
  }
  if (!r.ok) {
    return { ok: false, message: data.error || r.statusText };
  }
  if (
    data.logicalRouteId !== "operator.integration.connect" ||
    data.viewId !== "integration_connect_surface"
  ) {
    return { ok: false, message: "Governance contract mismatch for this page." };
  }
  return { ok: true, ctx: data as GovernanceContextResponse };
}

/** Accepts raw opaque token or a full URL containing ?token= */
function extractConnectTokenFromInput(raw: string): string {
  const t = raw.trim();
  const m = t.match(/[?&]token=([^&]+)/);
  if (m?.[1]) return decodeURIComponent(m[1]);
  return t;
}

async function postConnectExchange(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await fetch("/api/integration/connect/exchange", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = (await r.json()) as { ok?: boolean; validation?: { status?: string }; error?: string };
  if (r.ok && data.ok === true) return { ok: true };
  const msg =
    data.error ||
    (data.validation && typeof data.validation === "object" && "status" in data.validation
      ? String((data.validation as { status: string }).status)
      : null) ||
    r.statusText;
  return { ok: false, message: String(msg) };
}

type SurfaceFetchResult =
  | { kind: "ok"; surface: SurfaceResponse }
  | { kind: "session_required" }
  | { kind: "error"; message: string };

async function fetchSurfaceResult(): Promise<SurfaceFetchResult> {
  const r = await fetch("/api/integration/connect/cloudbeds/surface", { credentials: "include" });
  const data = (await r.json()) as SurfaceResponse & { error?: string };
  if (r.status === 401 && data.error === "integration_connect_session_required") {
    return { kind: "session_required" };
  }
  if (!r.ok) {
    return { kind: "error", message: data.error || r.statusText };
  }
  return { kind: "ok", surface: data as SurfaceResponse };
}

async function fetchHotelDetails(): Promise<Record<string, unknown>> {
  const r = await fetch("/api/integration/connect/cloudbeds/hotel-details", { credentials: "include" });
  const data = (await r.json()) as HotelDetailsResponse & { error?: string };
  if (!r.ok) {
    throw new Error(data.error || r.statusText);
  }
  if (!data.ok || !data.hotel) {
    throw new Error(data.error || "Hotel details unavailable.");
  }
  return data.hotel;
}

const textFieldOnCanvasSx = {
  "& .MuiInputBase-input": { color: CANVAS.text },
  "& .MuiInputLabel-root": { color: CANVAS.textMuted },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: CANVAS.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: CANVAS.borderStrong },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.blueLight },
} as const;

export default function CloudbedsConnectPage() {
  const [governanceError, setGovernanceError] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [exchangeDone, setExchangeDone] = useState(false);
  const [surface, setSurface] = useState<SurfaceResponse | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [hotel, setHotel] = useState<Record<string, unknown> | null>(null);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRequired, setSessionRequired] = useState(false);
  const [pastedToken, setPastedToken] = useState("");
  const [submittingToken, setSubmittingToken] = useState(false);

  const oauthJustFinished = new URLSearchParams(window.location.search).get("status") === "oauth_success";

  const loadSurface = useCallback(async () => {
    setSurfaceError(null);
    setSessionRequired(false);
    try {
      const result = await fetchSurfaceResult();
      if (result.kind === "session_required") {
        setSurface(null);
        setSessionRequired(true);
        return;
      }
      if (result.kind === "error") {
        setSurface(null);
        setSurfaceError(result.message);
        return;
      }
      setSurface(result.surface);
    } catch (e: unknown) {
      setSurface(null);
      setSurfaceError(e instanceof Error ? e.message : "Could not load connect surface.");
    }
  }, []);

  const submitPastedToken = useCallback(async () => {
    const t = extractConnectTokenFromInput(pastedToken);
    if (!t) return;
    setSubmittingToken(true);
    setExchangeError(null);
    try {
      const ex = await postConnectExchange(t);
      if (!ex.ok) {
        setExchangeError(ex.message || "Invalid or expired token.");
        return;
      }
      setExchangeDone(true);
      setPastedToken("");
      await loadSurface();
    } finally {
      setSubmittingToken(false);
    }
  }, [pastedToken, loadSurface]);

  const loadHotel = useCallback(async () => {
    setHotelError(null);
    try {
      const h = await fetchHotelDetails();
      setHotel(h);
    } catch (e: unknown) {
      setHotelError(e instanceof Error ? e.message : "Hotel details request failed.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    async function run() {
      setLoading(true);
      setGovernanceError(null);
      setExchangeError(null);

      const gov = await fetchGovernanceContext();
      if (!gov.ok) {
        setGovernanceError(gov.message);
        setLoading(false);
        return;
      }
      const adapterPath = gov.ctx.browserAdapterPath || "/connect/cloudbeds";

      if (token) {
        const ex = await postConnectExchange(token);
        if (!ex.ok) {
          setExchangeError(ex.message || "Invalid or expired connect link.");
          setLoading(false);
          return;
        }
        setExchangeDone(true);
        window.history.replaceState({}, "", adapterPath);
      }

      try {
        await loadSurface();
      } catch {
        /* surface errors handled in loadSurface */
      }

      setLoading(false);
    }

    void run();
  }, [loadSurface]);

  useEffect(() => {
    if (!surface || loading || sessionRequired || governanceError) return;
    void loadHotel();
  }, [surface, loading, sessionRequired, governanceError, loadHotel]);

  const oauthHref =
    surface && typeof window !== "undefined"
      ? `${window.location.origin}${surface.oauthStartPath}`
      : "";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: SHELL.bg }}>
      <SovereignPageShell className="py-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Box
            sx={{
              bgcolor: CANVAS.bg,
              borderRadius: "24px",
              border: `1px solid ${CANVAS.border}`,
              p: { xs: 2.5, sm: 4 },
              boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              fontWeight={700}
              sx={{ color: CANVAS.text, mb: 1 }}
            >
              Connect Cloudbeds
            </Typography>
            <Typography variant="body1" sx={{ color: CANVAS.textMuted, mb: 3, lineHeight: 1.6 }}>
              Use the secure link from SMS, then sign in with Cloudbeds. When your site is linked, property details
              appear below.
            </Typography>

            {governanceError && (
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: "#fef2f2",
                  borderColor: "#fecaca",
                }}
              >
                <CardContent>
                  <Typography sx={{ color: "#991b1b" }} variant="body2" fontWeight={600}>
                    Governed connect unavailable
                  </Typography>
                  <Typography sx={{ color: "#991b1b", mt: 1 }} variant="body2">
                    {governanceError}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {loading && (
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <CircularProgress size={28} sx={{ color: BRAND.blueLight }} />
                <Typography variant="body2" sx={{ color: CANVAS.textMuted }}>
                  Resolving governed connect surface…
                </Typography>
              </Box>
            )}

            {exchangeError && (
              <Card
                variant="outlined"
                sx={{
                  mb: 2,
                  bgcolor: "#fef2f2",
                  borderColor: "#fecaca",
                }}
              >
                <CardContent>
                  <Typography sx={{ color: "#991b1b" }} variant="body2">
                    {exchangeError}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {exchangeDone && !exchangeError && (
              <Typography variant="body2" sx={{ color: BRAND.green, mb: 2, fontWeight: 500 }}>
                Session started. Continue with Cloudbeds below.
              </Typography>
            )}

            {sessionRequired && !loading && (
              <Box
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: "16px",
                  bgcolor: CANVAS.bgSubtle,
                  border: `1px solid ${CANVAS.border}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} sx={{ color: CANVAS.text, mb: 1 }}>
                  Secure link required
                </Typography>
                <Typography variant="body2" sx={{ color: CANVAS.textMuted, mb: 2, lineHeight: 1.65 }}>
                  Open the link from your SMS, or paste the token here. The SMS link looks like this:{" "}
                  <Box
                    component="code"
                    sx={{
                      display: "inline",
                      bgcolor: CANVAS.bg,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: CANVAS.text,
                      border: `1px solid ${CANVAS.border}`,
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    ?token=…
                  </Box>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Token or full link"
                  placeholder="Paste token or full URL"
                  value={pastedToken}
                  onChange={(e) => setPastedToken(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    const fromQuery = text.match(/[?&]token=([^&]+)/);
                    if (fromQuery?.[1]) {
                      e.preventDefault();
                      setPastedToken(decodeURIComponent(fromQuery[1]));
                    }
                  }}
                  sx={{ mb: 2, ...textFieldOnCanvasSx }}
                />
                <Button
                  variant="contained"
                  disabled={submittingToken || !pastedToken.trim()}
                  onClick={() => void submitPastedToken()}
                  sx={{
                    bgcolor: BRAND.blueLight,
                    "&:hover": { bgcolor: "#4f46e5" },
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {submittingToken ? "Verifying…" : "Continue"}
                </Button>
              </Box>
            )}

            {surfaceError && (
              <Typography variant="body2" sx={{ color: "#b91c1c", mb: 2 }}>
                {surfaceError}
              </Typography>
            )}

            {surface && !surfaceError && !sessionRequired && (
              <Box
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: "16px",
                  bgcolor: CANVAS.bgSubtle,
                  border: `1px solid ${CANVAS.border}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: CANVAS.textMuted, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                  Connection status
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", wordBreak: "break-all", color: CANVAS.text }}>
                  siteConfigId: {surface.siteConfigId}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", wordBreak: "break-all", color: CANVAS.text }}>
                  OAuth callback: {surface.callbackUrl ?? "—"}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: CANVAS.textMuted }}>
                  Cloudbeds client ID in environment: {surface.clientIdConfigured ? "yes" : "no"}
                </Typography>
                {surface.pms && (
                  <Typography variant="body2" sx={{ mt: 1, color: CANVAS.textMuted }}>
                    PMS: auth {surface.pms.authLane ?? "—"} · property {surface.pms.propertyId ?? "—"} · credentials{" "}
                    {surface.pms.hasCredentials ? "present" : "missing"}
                  </Typography>
                )}
                <Divider sx={{ my: 2, borderColor: CANVAS.border }} />
                <Button
                  component="a"
                  href={oauthHref}
                  variant="contained"
                  disabled={!surface.clientIdConfigured}
                  sx={{
                    bgcolor: BRAND.blueLight,
                    "&:hover": { bgcolor: "#4f46e5" },
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Continue to Cloudbeds OAuth
                </Button>
                {!surface.clientIdConfigured && (
                  <Typography variant="caption" display="block" sx={{ mt: 1.5, color: CANVAS.textMuted }}>
                    Set CLOUDBEDS_CLIENT_ID and CLOUDBEDS_CLIENT_CALLBACK_URL in the platform environment.
                  </Typography>
                )}
              </Box>
            )}

            {oauthJustFinished && (
              <Typography variant="body2" sx={{ color: BRAND.green, mb: 2, fontWeight: 500 }}>
                OAuth completed — loading property from Cloudbeds.
              </Typography>
            )}

            {hotelError && (
              <Typography variant="body2" sx={{ color: "#b91c1c", mb: 2 }}>
                {hotelError}
              </Typography>
            )}

            {hotel && Object.keys(hotel).length > 0 && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "16px",
                  bgcolor: CANVAS.bgSubtle,
                  border: `1px solid ${CANVAS.border}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: CANVAS.textMuted, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.75rem" }}>
                  Property
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: CANVAS.text }}>
                  {String(hotel.propertyName ?? "Property")}
                </Typography>
                {hotel.propertyID != null && (
                  <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", mt: 1, color: CANVAS.textMuted }}>
                    propertyID: {String(hotel.propertyID)}
                  </Typography>
                )}
                {hotel.propertyAddress != null && typeof hotel.propertyAddress === "object" && (
                  <Typography variant="body2" sx={{ mt: 1, color: CANVAS.text }}>
                    {Object.values(hotel.propertyAddress as Record<string, string>).filter(Boolean).join(", ")}
                  </Typography>
                )}
                {hotel.propertyPhone != null && (
                  <Typography variant="body2" sx={{ mt: 1, color: CANVAS.text }}>
                    {String(hotel.propertyPhone)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </motion.div>
      </SovereignPageShell>
    </Box>
  );
}
