// Front Desk View - Operations Console
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { useSharedCanvasDispatch } from "../../../shell/SharedCanvasProvider";
import { executeAction } from "../../../os-core/control-plane/action-registry/executeAction";
import { useOSEventLog } from "../../../os-core/observability/EventLogProvider";
import { appendSystemEvent } from "../../../os-core/observability/system-events";
import {
  type FrontDeskCommunicationEvent,
  type FrontDeskSession,
  getFrontDeskQueuePriority,
} from "../../../os-core/control-plane/contracts/frontDeskSession";

const ASSISTANT_NAME = "Anna";

interface FrontDeskMessagingSettings {
  confirmationTemplate: string;
  reminderTemplate: string;
  postVisitTemplate: string;
  confirmationSendWindowHours: number;
  sameDayReminderHour: string;
}

interface ReviewSnapshot {
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface WorkspaceSiteConfig {
  id: string;
  slug?: string | null;
  name?: string | null;
  greetingMessage?: string | null;
  plan?: string | null;
  provisionedPhoneNumber?: string | null;
  placeData?: unknown;
  staticRoutes?: {
    text?: { enabled?: boolean; value?: string };
  } | null;
}

interface WorkspaceQrRoute {
  id: number;
  routeUrl: string;
  destination: string | null;
  isActive: boolean;
}

interface SiteChatLog {
  id: string;
  role: string;
  content: string;
  createdAt?: string | null;
}

interface ConversationSummary {
  totals?: Record<string, number>;
  total?: number;
}

interface ApiFrontDeskSession {
  sessionId: string;
  siteConfigId: string;
  customerId?: string | null;
  entrySource: "web_chat" | "voice_call" | "sms" | "qr" | "manual";
  verificationState:
    | "unknown"
    | "required"
    | "otp_sent"
    | "verified"
    | "failed"
    | "bypass_allowed"
    | "unverified";
  workflowState:
    | "NEW"
    | "AI_ACTIVE"
    | "WAITING_FOR_CUSTOMER"
    | "ESCALATION_REQUESTED"
    | "OPERATOR_JOINED"
    | "RESOLVED";
  escalationState: string;
  operatorJoined: boolean;
  assistMode: "none" | "observe" | "coPilot" | "takeover";
  transcriptPreview?: string;
  workflowFlags?: Record<string, boolean>;
  outcomeType?: OutcomeType;
  resolvedAt?: string;
  resolvedBy?: string;
  lastActivityAt: string;
}

interface FrontDeskSessionsResponse {
  sessions?: ApiFrontDeskSession[];
  updatedAt?: string;
  projectionVersion?: number;
}

interface VerificationPolicyResponse {
  policy: {
    level: "basic" | "standard" | "strict";
    steps: {
      otp: boolean;
      magicLink: boolean;
      biometric: boolean;
      idDocument: boolean;
      digitalSignature: boolean;
      insuranceCardUpload: boolean;
      selfiePhotoMatch: boolean;
    };
  };
}

type OutcomeType = "lead" | "booking" | "task" | "resolved_no_action" | "escalated";

interface DurableOutcomeSummary {
  totalResolved: number;
  bookings: number;
  leads: number;
  tasks: number;
  escalations: number;
  resolvedNoAction: number;
  operatorJoinedCount: number;
}

const DEFAULT_SETTINGS: FrontDeskMessagingSettings = {
  confirmationTemplate:
    "Your appointment at Joint Chiropractic Lafayette is confirmed. Reply HELP for assistance.",
  reminderTemplate:
    "Friendly reminder: your appointment is today at {{time}}. Reply C to confirm.",
  postVisitTemplate:
    "Thanks for visiting Joint Chiropractic Lafayette. Please rate your experience.",
  confirmationSendWindowHours: 24,
  sameDayReminderHour: "09:00",
};

const GOOGLE_REVIEWS_LAST_5: ReviewSnapshot[] = [
  {
    author: "M. Richards",
    rating: 5,
    text: "Fast check-in and super friendly team. In and out quickly.",
    createdAt: "Today",
  },
  {
    author: "J. Alvarez",
    rating: 4,
    text: "Great adjustment, parking was tight but staff was helpful.",
    createdAt: "Yesterday",
  },
  {
    author: "K. Patel",
    rating: 5,
    text: "Loved the clear communication and reminders.",
    createdAt: "2 days ago",
  },
  {
    author: "R. George",
    rating: 5,
    text: "Clean location, smooth process, excellent care.",
    createdAt: "3 days ago",
  },
  {
    author: "D. Smith",
    rating: 4,
    text: "Wait was short and the front desk was very responsive.",
    createdAt: "4 days ago",
  },
];

function getLatestCommunication(
  events: FrontDeskCommunicationEvent[]
): FrontDeskCommunicationEvent | undefined {
  return events[events.length - 1];
}

function extractReviewsFromPlaceData(placeData: unknown): ReviewSnapshot[] {
  if (!placeData || typeof placeData !== "object") return [];
  const maybeReviews = (placeData as { reviews?: unknown }).reviews;
  if (!Array.isArray(maybeReviews)) return [];

  return maybeReviews.slice(0, 5).map((entry, index) => {
    const item = entry as Record<string, unknown>;
    const author =
      typeof item.authorName === "string"
        ? item.authorName
        : typeof item.author_name === "string"
          ? item.author_name
          : `Reviewer ${index + 1}`;
    const ratingRaw = item.rating;
    const rating = typeof ratingRaw === "number" ? Math.max(1, Math.min(5, Math.round(ratingRaw))) : 5;
    const text =
      typeof item.text === "string"
        ? item.text
        : typeof item.comment === "string"
          ? item.comment
          : "No review text provided.";
    const createdAt =
      typeof item.relativeTimeDescription === "string"
        ? item.relativeTimeDescription
        : typeof item.time === "string"
          ? item.time
          : "Recent";
    return { author, rating, text, createdAt };
  });
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("gateway_auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function mapApiSessionToViewSession(api: ApiFrontDeskSession, siteId: string): FrontDeskSession {
  const entrySourceMap: Record<ApiFrontDeskSession["entrySource"], FrontDeskSession["entrySource"]> = {
    web_chat: "website",
    voice_call: "phone",
    sms: "sms_link",
    qr: "qr",
    manual: "website",
  };
  const identityState: FrontDeskSession["identityState"] =
    api.verificationState === "verified"
      ? "verified"
      : api.verificationState === "failed"
        ? "verification_failed"
        : api.verificationState === "required" || api.verificationState === "otp_sent"
          ? "otp_pending"
      : api.verificationState === "unverified"
        ? "unverified"
        : "otp_pending";
  const escalationState: FrontDeskSession["escalationState"] =
    api.escalationState === "requested" ||
    api.escalationState === "active" ||
    api.escalationState === "closed"
      ? api.escalationState
      : "none";
  const assistMode: FrontDeskSession["assistMode"] =
    api.assistMode === "coPilot" || api.assistMode === "takeover" || api.assistMode === "observe"
      ? api.assistMode
      : "observe";

  return {
    sessionId: api.sessionId,
    tenantId: siteId,
    siteConfigId: api.siteConfigId,
    entrySource: entrySourceMap[api.entrySource] ?? "website",
    customerId: api.customerId ?? undefined,
    identityState,
    workflowState: api.workflowState,
    assignedAgentId: "joint-frontdesk-agent",
    escalationState,
    assistMode,
    transcriptPreview:
      api.transcriptPreview || "Live projection from governed front desk session model.",
    humanAvailable: true,
    customerVerified: api.verificationState === "verified",
    arrivalTime: undefined,
    waitMinutes: undefined,
    appointmentConfirmed: false,
    communicationHistory: [],
    outcomeType: api.outcomeType,
    workflowFlags: api.workflowFlags ?? {},
    resolvedAt: api.resolvedAt,
    resolvedBy: api.resolvedBy,
    lastActivityAt: new Date(api.lastActivityAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const MOCK_SESSIONS: FrontDeskSession[] = [
  {
    sessionId: "sess_01",
    tenantId: "joint-chiropractic",
    siteConfigId: "joint-lafayette",
    entrySource: "phone",
    customerId: "cust_1001",
    identityState: "verified",
    workflowState: "ESCALATION_REQUESTED",
    assignedAgentId: "joint-frontdesk-agent",
    escalationState: "requested",
    assistMode: "coPilot",
    transcriptPreview: "I need to reschedule my adjustment for tomorrow morning.",
    humanAvailable: true,
    customerVerified: true,
    arrivalTime: "9:55 AM",
    waitMinutes: 6,
    appointmentConfirmed: true,
    communicationHistory: [
      {
        timestamp: "9:32 AM",
        channel: "sms",
        direction: "outbound",
        summary: "Appointment confirmation sent.",
      },
      {
        timestamp: "9:40 AM",
        channel: "sms",
        direction: "inbound",
        summary: "Customer confirmed with 'C'.",
      },
      {
        timestamp: "10:04 AM",
        channel: "voice",
        direction: "inbound",
        summary: "Requested reschedule and escalation.",
      },
    ],
    lastActivityAt: "10:04 AM",
  },
  {
    sessionId: "sess_02",
    tenantId: "joint-chiropractic",
    siteConfigId: "joint-lafayette",
    entrySource: "qr",
    customerId: "cust_1002",
    identityState: "otp_pending",
    workflowState: "AI_ACTIVE",
    assignedAgentId: "joint-frontdesk-agent",
    escalationState: "none",
    assistMode: "observe",
    transcriptPreview: "I am here for a new patient consultation.",
    humanAvailable: true,
    customerVerified: false,
    arrivalTime: "10:02 AM",
    waitMinutes: 4,
    appointmentConfirmed: false,
    communicationHistory: [
      {
        timestamp: "9:50 AM",
        channel: "sms",
        direction: "outbound",
        summary: "OTP verification sent.",
      },
      {
        timestamp: "10:06 AM",
        channel: "web",
        direction: "inbound",
        summary: "QR session opened by customer.",
      },
    ],
    lastActivityAt: "10:06 AM",
  },
  {
    sessionId: "sess_03",
    tenantId: "joint-chiropractic",
    siteConfigId: "joint-lafayette",
    entrySource: "website",
    customerId: "cust_1003",
    identityState: "verified",
    workflowState: "WAITING_FOR_CUSTOMER",
    assignedAgentId: "joint-frontdesk-agent",
    escalationState: "none",
    assistMode: "observe",
    transcriptPreview: "Please confirm your preferred provider and arrival time.",
    humanAvailable: false,
    customerVerified: true,
    arrivalTime: "9:51 AM",
    waitMinutes: 0,
    appointmentConfirmed: true,
    communicationHistory: [
      {
        timestamp: "8:30 AM",
        channel: "sms",
        direction: "outbound",
        summary: "Same-day reminder sent.",
      },
      {
        timestamp: "9:58 AM",
        channel: "voice",
        direction: "system",
        summary: "Customer dropped from active call, awaiting response.",
      },
    ],
    lastActivityAt: "9:58 AM",
  },
];

function statusTone(state: FrontDeskSession["workflowState"]): string {
  if (state === "ESCALATION_REQUESTED") return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  if (state === "OPERATOR_JOINED") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (state === "AI_ACTIVE") return "text-indigo-300 border-indigo-500/30 bg-indigo-500/10";
  if (state === "WAITING_FOR_CUSTOMER")
    return "text-amber-300 border-amber-500/30 bg-amber-500/10";
  return "text-slate-300 border-slate-600/40 bg-slate-800/50";
}

function verificationLabel(session: FrontDeskSession): string {
  if (session.customerVerified || session.identityState === "verified") return "Verified";
  if (session.workflowFlags?.verificationBypassAllowed) return "Bypass Allowed";
  if (session.workflowFlags?.verificationRequired) return "Required";
  if (session.identityState === "otp_pending") return "OTP Pending";
  if (session.identityState === "verification_failed") return "Verification Failed";
  return "Unverified";
}

function verificationTone(session: FrontDeskSession): string {
  if (session.customerVerified || session.identityState === "verified") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (session.identityState === "otp_pending") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
  if (session.workflowFlags?.verificationBypassAllowed) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-200";
}

export function FrontDeskView({ siteId }: { siteId: string }) {
  const dispatch = useSharedCanvasDispatch();
  const { appendEvent, events } = useOSEventLog();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(MOCK_SESSIONS[0].sessionId);
  const [sessions, setSessions] = useState<FrontDeskSession[]>(
    [...MOCK_SESSIONS].sort((a, b) => {
      const priorityDiff = getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
    })
  );
  const [siteConfig, setSiteConfig] = useState<WorkspaceSiteConfig | null>(null);
  const [qrRoutes, setQrRoutes] = useState<WorkspaceQrRoute[]>([]);
  const [chatLogs, setChatLogs] = useState<SiteChatLog[]>([]);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [durableOutcomeSummary, setDurableOutcomeSummary] =
    useState<DurableOutcomeSummary | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [qrMessage, setQrMessage] = useState<string>("");
  const [outcomeType, setOutcomeType] = useState<OutcomeType>("booking");
  const [showResolvedSessions, setShowResolvedSessions] = useState<boolean>(false);
  const [projectionVersion, setProjectionVersion] = useState<number>(0);
  const [projectionUpdatedAt, setProjectionUpdatedAt] = useState<string | null>(null);
  const [verificationPolicy, setVerificationPolicy] =
    useState<VerificationPolicyResponse["policy"] | null>(null);
  const selectedSession =
    sessions.find((session) => session.sessionId === selectedSessionId) ?? sessions[0];
  const businessName = siteConfig?.name?.trim() || "Joint Chiropractic Lafayette";
  const greetingLine =
    siteConfig?.greetingMessage?.trim() ||
    `Hello, welcome to ${businessName}. I am ${ASSISTANT_NAME}, your AI front desk assistant.`;

  useEffect(() => {
    if (!sessions.length) return;
    if (!selectedSessionId || !sessions.some((session) => session.sessionId === selectedSessionId)) {
      setSelectedSessionId(sessions[0].sessionId);
    }
  }, [selectedSessionId, sessions]);

  // Context key sync only
  useEffect(() => {
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "siteConfigId", value: siteId },
    });
  }, [dispatch, siteId]);

  useEffect(() => {
    if (!selectedSession) return;
    dispatch({
      type: "SET_CONTEXT_KEY",
      payload: { key: "sessionId", value: selectedSession.sessionId },
    });
  }, [dispatch, selectedSession]);

  useEffect(() => {
    let cancelled = false;
    const loadQrData = async () => {
      setQrLoading(true);
      try {
        const [siteRes, routesRes, chatLogsRes, sessionsRes, summaryRes, outcomeSummaryRes, verificationPolicyRes] = await Promise.all([
          fetch(`/api/site-configs/${siteId}`),
          fetch(`/api/qr-routes?page=1&limit=20&siteConfigId=${encodeURIComponent(siteId)}`, {
            headers: { ...getAuthHeaders() },
          }),
          fetch(`/api/site-configs/${siteId}/chat-logs?limit=20`, {
            headers: { ...getAuthHeaders() },
          }),
          fetch(
            `/api/site-configs/${siteId}/frontdesk/sessions?includeResolved=${showResolvedSessions}&limit=300`,
            {
              headers: { ...getAuthHeaders() },
            }
          ),
          fetch(`/api/site-configs/${siteId}/conversation-events/summary`, {
            headers: { ...getAuthHeaders() },
          }),
          fetch(`/api/site-configs/${siteId}/outcomes/summary?range=today`, {
            headers: { ...getAuthHeaders() },
          }),
          fetch(`/api/site-configs/${siteId}/verification-policy`, {
            headers: { ...getAuthHeaders() },
          }),
        ]);

        if (!cancelled && siteRes.ok) {
          const site = (await siteRes.json()) as WorkspaceSiteConfig;
          setSiteConfig(site);
        }

        if (!cancelled && routesRes.ok) {
          const payload = (await routesRes.json()) as { routes?: WorkspaceQrRoute[] };
          setQrRoutes(Array.isArray(payload.routes) ? payload.routes : []);
        }
        if (!cancelled && chatLogsRes.ok) {
          const logs = (await chatLogsRes.json()) as SiteChatLog[];
          setChatLogs(Array.isArray(logs) ? logs : []);
        }
        if (!cancelled && sessionsRes.ok) {
          const payload = (await sessionsRes.json()) as FrontDeskSessionsResponse;
          const nextVersion = payload.projectionVersion ?? 0;
          if (nextVersion !== projectionVersion) {
            const mapped = (payload.sessions ?? [])
              .map((session) => mapApiSessionToViewSession(session, siteId))
              .sort((a, b) => {
                const priorityDiff = getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b);
                if (priorityDiff !== 0) return priorityDiff;
                return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
              });
            if (mapped.length > 0) {
              setSessions(mapped);
            }
            setProjectionVersion(nextVersion);
          }
          setProjectionUpdatedAt(payload.updatedAt ?? null);
        }
        if (!cancelled && summaryRes.ok) {
          const summary = (await summaryRes.json()) as ConversationSummary;
          setConversationSummary(summary);
        }
        if (!cancelled && outcomeSummaryRes.ok) {
          const summary = (await outcomeSummaryRes.json()) as DurableOutcomeSummary;
          setDurableOutcomeSummary(summary);
        }
        if (!cancelled && verificationPolicyRes.ok) {
          const payload = (await verificationPolicyRes.json()) as VerificationPolicyResponse;
          if (payload?.policy) setVerificationPolicy(payload.policy);
        }
      } catch {
        if (!cancelled) setQrMessage("Unable to load QR tools right now.");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    };

    void loadQrData();
    return () => {
      cancelled = true;
    };
  }, [siteId, showResolvedSessions]);

  const websiteQrImageUrl =
    siteConfig?.slug && typeof window !== "undefined"
      ? `${window.location.origin}/qr/img/${siteConfig.slug}`
      : null;
  const reviewSnapshots = useMemo(
    () =>
      siteConfig?.placeData
        ? (() => {
            const extracted = extractReviewsFromPlaceData(siteConfig.placeData);
            return extracted.length > 0 ? extracted : GOOGLE_REVIEWS_LAST_5;
          })()
        : GOOGLE_REVIEWS_LAST_5,
    [siteConfig?.placeData]
  );
  const communicationFeed = useMemo(() => {
    if (chatLogs.length === 0) return selectedSession.communicationHistory;
    return chatLogs.slice(0, 20).map((log) => ({
      timestamp: log.createdAt
        ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Recent",
      channel: "web" as const,
      direction:
        log.role === "assistant" ? ("outbound" as const) : ("inbound" as const),
      summary: log.content,
    }));
  }, [chatLogs, selectedSession.communicationHistory]);

  const runtimeOutcomeSummary = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();

    const summary = {
      totalResolved: 0,
      bookings: 0,
      leads: 0,
      tasks: 0,
      escalations: 0,
      resolvedNoAction: 0,
      operatorJoinedCount: 0,
      activeSessions: 0,
      operatorJoinedNow: 0,
      waitingForAssist: 0,
      lastUpdatedAt: new Date(now).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    for (const event of events) {
      const ts = new Date(event.timestamp).getTime();
      if (Number.isNaN(ts) || ts < startMs) continue;
      const payload = event.payload as {
        type?: string;
        outcomeType?: OutcomeType;
      };
      if (payload.type === "SESSION_ASSIST_JOINED") {
        summary.operatorJoinedCount += 1;
      }
      if (payload.type === "SESSION_OUTCOME_CAPTURED") {
        summary.totalResolved += 1;
        if (payload.outcomeType === "booking") summary.bookings += 1;
        if (payload.outcomeType === "lead") summary.leads += 1;
        if (payload.outcomeType === "task") summary.tasks += 1;
        if (payload.outcomeType === "escalated") summary.escalations += 1;
        if (payload.outcomeType === "resolved_no_action") summary.resolvedNoAction += 1;
      }
    }

    for (const session of sessions) {
      if (session.workflowState !== "RESOLVED") summary.activeSessions += 1;
      if (session.workflowState === "OPERATOR_JOINED") summary.operatorJoinedNow += 1;
      if (session.workflowState === "ESCALATION_REQUESTED") summary.waitingForAssist += 1;
    }

    return summary;
  }, [events, sessions]);

  const outcomeSummary = useMemo(() => {
    if (!durableOutcomeSummary) return runtimeOutcomeSummary;
    return {
      ...runtimeOutcomeSummary,
      totalResolved: durableOutcomeSummary.totalResolved,
      bookings: durableOutcomeSummary.bookings,
      leads: durableOutcomeSummary.leads,
      tasks: durableOutcomeSummary.tasks,
      escalations: durableOutcomeSummary.escalations,
      resolvedNoAction: durableOutcomeSummary.resolvedNoAction,
      operatorJoinedCount: durableOutcomeSummary.operatorJoinedCount,
    };
  }, [durableOutcomeSummary, runtimeOutcomeSummary]);

  const refreshProjectedSessions = async () => {
    const res = await fetch(
      `/api/site-configs/${siteId}/frontdesk/sessions?includeResolved=${showResolvedSessions}&limit=300`,
      { headers: { ...getAuthHeaders() } }
    );
    if (!res.ok) return;
    const payload = (await res.json()) as FrontDeskSessionsResponse;
    const nextVersion = payload.projectionVersion ?? 0;
    if (nextVersion === projectionVersion) {
      setProjectionUpdatedAt(payload.updatedAt ?? null);
      return;
    }
    const mapped = (payload.sessions ?? [])
      .map((session) => mapApiSessionToViewSession(session, siteId))
      .sort((a, b) => {
        const priorityDiff = getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b);
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
      });
    if (mapped.length > 0) setSessions(mapped);
    setProjectionVersion(nextVersion);
    setProjectionUpdatedAt(payload.updatedAt ?? null);
  };

  const handleGenerateWebsiteQr = async () => {
    try {
      setQrMessage("");
      const res = await fetch(`/api/qr/generate/${encodeURIComponent(siteId)}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate QR");
      const refreshedSite = await fetch(`/api/site-configs/${siteId}`);
      if (refreshedSite.ok) {
        const site = (await refreshedSite.json()) as WorkspaceSiteConfig;
        setSiteConfig(site);
      }
      setQrMessage("Website QR generated.");
    } catch {
      setQrMessage("Failed to generate website QR.");
    }
  };

  const handleDownloadQr = async (imageUrl: string, filename: string) => {
    try {
      const res = await fetch(imageUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const handleUpdateRoute = async (
    routeId: number,
    updates: Partial<Pick<WorkspaceQrRoute, "destination" | "isActive">>
  ) => {
    try {
      setQrMessage("");
      const res = await fetch(`/api/qr-routes/${routeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Route update failed");
      const payload = (await res.json()) as WorkspaceQrRoute;
      setQrRoutes((prev) => prev.map((route) => (route.id === routeId ? payload : route)));
      setQrMessage("Route updated.");
    } catch {
      setQrMessage("Failed to update route.");
    }
  };

  const handleJoinAssist = async (session: FrontDeskSession) => {
    try {
      const result = await executeAction({
        actionId: "session.joinAssist",
        contextKeys: {
          siteConfigId: siteId,
          sessionId: session.sessionId,
        },
        payload: {
          previousState: session.workflowState,
          nextMode: "OPERATOR_JOINED",
        },
      });

      const nextSessions = sessions
        .map((entry) =>
          entry.sessionId === session.sessionId
            ? {
                ...entry,
                workflowState: "OPERATOR_JOINED",
                escalationState: "active",
                assistMode: "coPilot",
                humanAvailable: true,
                lastActivityAt: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : entry
        )
        .sort((a, b) => {
          const priorityDiff = getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b);
          if (priorityDiff !== 0) return priorityDiff;
          return a.lastActivityAt < b.lastActivityAt ? 1 : -1;
        });

      setSessions(nextSessions);
      dispatch({ type: "SET_RESULT", payload: result });

      appendSystemEvent(
        "ACTION_EXECUTED",
        "Front desk operator joined an active AI session.",
        {
          actionId: result.actionId,
          auditEvent: result.auditEvent,
          sessionId: session.sessionId,
          siteConfigId: siteId,
        }
      );
      appendEvent({
        category: "GOVERNANCE_ACTION",
        os_state_snapshot: {
          shell_mode: "view",
          active_route_id: "workspace.detail",
          active_view_id: "workspace-router-view",
          breadcrumbs: ["Home", "Workspace", siteId],
        },
        payload: {
          type: "SESSION_ASSIST_JOINED",
          actionId: result.actionId,
          auditEvent: result.auditEvent,
          sessionId: session.sessionId,
          siteConfigId: siteId,
          message: result.message,
        },
      });
      await fetch(`/api/site-configs/${siteId}/outcomes/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          sessionId: session.sessionId,
          eventType: "frontdesk.assist_joined",
          metadata: {
            actionId: result.actionId,
            auditEvent: result.auditEvent,
            assistMode: "coPilot",
          },
        }),
      });
      const refreshed = await fetch(`/api/site-configs/${siteId}/outcomes/summary?range=today`, {
        headers: { ...getAuthHeaders() },
      });
      if (refreshed.ok) {
        const summary = (await refreshed.json()) as DurableOutcomeSummary;
        setDurableOutcomeSummary(summary);
      }
      await refreshProjectedSessions();
    } catch {
      setQrMessage("Failed to join assist mode.");
    }
  };

  const handleEndAssist = async (session: FrontDeskSession) => {
    try {
      const result = await executeAction({
        actionId: "session.endAssist",
        contextKeys: {
          siteConfigId: siteId,
          sessionId: session.sessionId,
        },
        payload: {
          previousState: session.workflowState,
          nextMode: "AI_ACTIVE",
        },
      });

      const nextSessions = sessions
        .map((entry) =>
          entry.sessionId === session.sessionId
            ? {
                ...entry,
                workflowState: "AI_ACTIVE" as const,
                escalationState: "closed" as const,
                assistMode: "observe" as const,
                lastActivityAt: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : entry
        )
        .sort((a, b) => getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b));
      setSessions(nextSessions);
      dispatch({ type: "SET_RESULT", payload: result });

      appendSystemEvent("ACTION_EXECUTED", "Front desk operator ended assist mode.", {
        actionId: result.actionId,
        auditEvent: result.auditEvent,
        sessionId: session.sessionId,
        siteConfigId: siteId,
      });
      appendEvent({
        category: "GOVERNANCE_ACTION",
        os_state_snapshot: {
          shell_mode: "view",
          active_route_id: "workspace.detail",
          active_view_id: "workspace-router-view",
          breadcrumbs: ["Home", "Workspace", siteId],
        },
        payload: {
          type: "SESSION_ASSIST_ENDED",
          actionId: result.actionId,
          auditEvent: result.auditEvent,
          sessionId: session.sessionId,
          siteConfigId: siteId,
          message: result.message,
        },
      });
      await fetch(`/api/site-configs/${siteId}/outcomes/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          sessionId: session.sessionId,
          eventType: "frontdesk.assist_ended",
          metadata: {
            actionId: result.actionId,
            auditEvent: result.auditEvent,
          },
        }),
      });
      await refreshProjectedSessions();
    } catch {
      setQrMessage("Failed to end assist mode.");
    }
  };

  const handleResolveOutcome = async (session: FrontDeskSession) => {
    try {
      const result = await executeAction({
        actionId: "session.resolveOutcome",
        contextKeys: {
          siteConfigId: siteId,
          sessionId: session.sessionId,
        },
        payload: {
          previousState: session.workflowState,
          outcomeType,
        },
      });

      const resolvedAt = new Date().toISOString();
      const resolvedBy = "frontdesk.operator";
      const nextSessions = sessions
        .map((entry) =>
          entry.sessionId === session.sessionId
            ? {
                ...entry,
                workflowState: "RESOLVED" as const,
                escalationState: "closed" as const,
                outcomeType,
                resolvedAt,
                resolvedBy,
                lastActivityAt: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : entry
        )
        .sort((a, b) => getFrontDeskQueuePriority(a) - getFrontDeskQueuePriority(b));
      setSessions(nextSessions);
      dispatch({ type: "SET_RESULT", payload: result });

      appendSystemEvent("ACTION_EXECUTED", "Front desk outcome resolved and captured.", {
        actionId: result.actionId,
        auditEvent: result.auditEvent,
        sessionId: session.sessionId,
        outcomeType,
        siteConfigId: siteId,
      });
      appendEvent({
        category: "GOVERNANCE_ACTION",
        os_state_snapshot: {
          shell_mode: "view",
          active_route_id: "workspace.detail",
          active_view_id: "workspace-router-view",
          breadcrumbs: ["Home", "Workspace", siteId],
        },
        payload: {
          type: "SESSION_OUTCOME_CAPTURED",
          actionId: result.actionId,
          auditEvent: result.auditEvent,
          sessionId: session.sessionId,
          outcomeType,
          resolvedAt,
          resolvedBy,
          siteConfigId: siteId,
          message: result.message,
        },
      });
      await fetch(`/api/site-configs/${siteId}/outcomes/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          sessionId: session.sessionId,
          eventType: "frontdesk.outcome_captured",
          metadata: {
            actionId: result.actionId,
            auditEvent: result.auditEvent,
            outcomeType,
            resolvedAt,
            resolvedBy,
          },
        }),
      });
      const refreshed = await fetch(`/api/site-configs/${siteId}/outcomes/summary?range=today`, {
        headers: { ...getAuthHeaders() },
      });
      if (refreshed.ok) {
        const summary = (await refreshed.json()) as DurableOutcomeSummary;
        setDurableOutcomeSummary(summary);
      }
      await refreshProjectedSessions();
    } catch {
      setQrMessage("Failed to capture outcome.");
    }
  };

  const handleActivateTelephony = async () => {
    try {
      setQrMessage("");
      const res = await fetch(`/api/site-configs/${siteId}/telephony/activate`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to activate telephony");
      const refreshedSite = await fetch(`/api/site-configs/${siteId}`);
      if (refreshedSite.ok) {
        const site = (await refreshedSite.json()) as WorkspaceSiteConfig;
        setSiteConfig(site);
      }
      setQrMessage(`Telephony activated: ${payload.phoneNumber || "number linked"}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to activate telephony for this site.";
      setQrMessage(message);
    }
  };

  const handleVerificationState = async (
    session: FrontDeskSession,
    verificationState: "required" | "otp_sent" | "verified" | "failed" | "bypass_allowed",
    checkpoints?: {
      idDocumentVerified?: boolean;
      selfiePhotoMatchVerified?: boolean;
      insuranceCardVerified?: boolean;
    }
  ) => {
    try {
      await fetch(`/api/site-configs/${siteId}/verification/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          sessionId: session.sessionId,
          verificationState,
          source: "operator",
          checkpoints,
        }),
      });
      await refreshProjectedSessions();
    } catch {
      setQrMessage("Failed to update verification state.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-8">
      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white">ClearView Front Desk</h1>
        <p className="mt-2 text-sm text-slate-300">
          {greetingLine} I can help immediately, and a human receptionist can join anytime when needed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-indigo-200">
            Workspace: {siteId}
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
            Human-in-the-loop enabled
          </span>
          {projectionUpdatedAt ? (
            <span className="rounded-full border border-slate-600/50 bg-slate-800/60 px-3 py-1 text-slate-300">
              Queue updated {new Date(projectionUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setShowResolvedSessions(false)}
            className={`rounded-full border px-3 py-1 ${
              !showResolvedSessions
                ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                : "border-slate-600/50 bg-slate-800/60 text-slate-300"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setShowResolvedSessions(true)}
            className={`rounded-full border px-3 py-1 ${
              showResolvedSessions
                ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                : "border-slate-600/50 bg-slate-800/60 text-slate-300"
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-2 text-sm font-semibold text-white">Customer Entry Bootstrap</div>
        <p className="mb-3 text-xs text-slate-300">
          Front-door contract: branded greeting, presence visibility, and verification state before
          workflow actions begin.
        </p>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-indigo-100">
            Assistant: {ASSISTANT_NAME} online
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${
              selectedSession?.humanAvailable
                ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
                : "border-slate-600/40 bg-slate-800/60 text-slate-300"
            }`}
          >
            Human receptionist: {selectedSession?.humanAvailable ? "Available" : "Offline"}
          </span>
          <span className={`rounded-full border px-3 py-1 ${verificationTone(selectedSession)}`}>
            Verification: {verificationLabel(selectedSession)}
          </span>
        </div>
        <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200">
          Push-to-talk is available in all chat modes. Customers can ask for appointment booking,
          rescheduling, care questions, or immediate human assist.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Book Appointment", "Reschedule", "Billing Question", "Talk to Human"].map((option) => (
            <span
              key={option}
              className="rounded-full border border-slate-600/60 bg-slate-800/70 px-3 py-1 text-[11px] text-slate-200"
            >
              {option}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-2 text-sm font-semibold text-white">Clear Check Point</div>
        <p className="mb-3 text-xs text-slate-300">
          Governed identity flow for this session. Steps are controlled by site policy and can be
          used in both voice and chat runtime.
        </p>
        <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-slate-600/50 bg-slate-800/60 px-3 py-1 text-slate-200">
            Policy: {verificationPolicy?.level ?? "standard"}
          </span>
          {verificationPolicy?.steps.otp ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200">OTP</span>
          ) : null}
          {verificationPolicy?.steps.magicLink ? (
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-indigo-200">Magic Link</span>
          ) : null}
          {verificationPolicy?.steps.idDocument ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-200">ID Document</span>
          ) : null}
          {verificationPolicy?.steps.selfiePhotoMatch ? (
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200">Selfie Match</span>
          ) : null}
          {verificationPolicy?.steps.insuranceCardUpload ? (
            <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-teal-200">Insurance Upload</span>
          ) : null}
          {verificationPolicy?.steps.digitalSignature ? (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-violet-200">Digital Signature</span>
          ) : null}
          {verificationPolicy?.steps.biometric ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">Biometric</span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => void handleVerificationState(selectedSession, "required")}
            className="rounded border border-slate-600/60 bg-slate-700/60 px-3 py-2 text-xs text-slate-100"
          >
            Start Verification
          </button>
          <button
            type="button"
            onClick={() => void handleVerificationState(selectedSession, "otp_sent")}
            className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          >
            Send OTP / Magic Link
          </button>
          <button
            type="button"
            onClick={() =>
              void handleVerificationState(selectedSession, "required", {
                idDocumentVerified: true,
              })
            }
            className="rounded border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200"
          >
            ID Checkpoint Passed
          </button>
          <button
            type="button"
            onClick={() =>
              void handleVerificationState(selectedSession, "required", {
                selfiePhotoMatchVerified: true,
              })
            }
            className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-200"
          >
            Photo Match Passed
          </button>
          <button
            type="button"
            onClick={() =>
              void handleVerificationState(selectedSession, "required", {
                insuranceCardVerified: true,
              })
            }
            className="rounded border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs text-teal-200"
          >
            Insurance Upload Verified
          </button>
          <button
            type="button"
            onClick={() => void handleVerificationState(selectedSession, "verified")}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
          >
            Mark Fully Verified
          </button>
          <button
            type="button"
            onClick={() => void handleVerificationState(selectedSession, "failed")}
            className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            Fail Verification
          </button>
          <button
            type="button"
            onClick={() => void handleVerificationState(selectedSession, "bypass_allowed")}
            className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200"
          >
            Allow Verified Bypass
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            type="button"
            onClick={() => setSelectedSessionId(session.sessionId)}
            className={`rounded-2xl border bg-slate-900/40 p-5 text-left backdrop-blur-xl ${
              selectedSession.sessionId === session.sessionId
                ? "border-indigo-400/50"
                : "border-indigo-500/20"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">{session.sessionId}</div>
              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(
                  session.workflowState
                )}`}
              >
                {session.workflowState}
              </span>
            </div>
            <div className="mb-3 text-xs text-slate-400">
              {session.entrySource.toUpperCase()} • Last activity {session.lastActivityAt}
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
              <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2 py-1">
                Arrival: {session.arrivalTime ?? "N/A"}
              </div>
              <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2 py-1">
                Wait: {session.waitMinutes ?? 0}m
              </div>
              <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2 py-1">
                {session.appointmentConfirmed ? "Appt Confirmed" : "Unconfirmed"}
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-200">{session.transcriptPreview}</p>
            <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
              <span
                className={`rounded-full border px-2 py-1 ${
                  session.customerVerified
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                {session.customerVerified ? "Verified customer" : "Verification pending"}
              </span>
              <span
                className={`rounded-full border px-2 py-1 ${
                  session.humanAvailable
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
                    : "border-slate-600/40 bg-slate-800/60 text-slate-300"
                }`}
              >
                {session.humanAvailable ? "Human available" : "Human offline"}
              </span>
              <span className="rounded-full border border-slate-600/40 bg-slate-800/50 px-2 py-1 text-slate-300">
                Assist: {session.assistMode}
              </span>
              {session.customerId ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  Known Customer
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                  Unknown Caller
                </span>
              )}
              {session.workflowFlags?.newPatientIntakeComplete ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  newPatientIntakeComplete
                </span>
              ) : null}
              {session.workflowFlags?.insuranceInfoPendingReview ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                  insuranceInfoPendingReview
                </span>
              ) : null}
              {session.workflowFlags?.painAssessmentComplete ? (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-indigo-200">
                  painAssessmentComplete
                </span>
              ) : null}
              {session.workflowFlags?.consentFormsPending ? (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                  consentFormsPending
                </span>
              ) : null}
              {session.workflowFlags?.consentFormsComplete || session.workflowFlags?.consentSigned ? (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-200">
                  consentFormsComplete
                </span>
              ) : null}
              {session.workflowFlags?.appointmentBookingRequested ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  appointmentBookingRequested
                </span>
              ) : null}
              {session.workflowFlags?.rescheduleRequested ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                  rescheduleRequested
                </span>
              ) : null}
              {session.workflowFlags?.otpSent ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                  otpSent
                </span>
              ) : null}
              {session.workflowFlags?.verificationFailed ? (
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-200">
                  verificationFailed
                </span>
              ) : null}
              {session.workflowFlags?.verificationBypassAllowed ? (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                  verificationBypassAllowed
                </span>
              ) : null}
              {session.workflowFlags?.idDocumentVerified ? (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-200">
                  idDocumentVerified
                </span>
              ) : null}
              {session.workflowFlags?.selfiePhotoMatchVerified ? (
                <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-fuchsia-200">
                  selfiePhotoMatchVerified
                </span>
              ) : null}
              {session.workflowFlags?.insuranceCardVerified ? (
                <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-teal-200">
                  insuranceCardVerified
                </span>
              ) : null}
            </div>
            {getLatestCommunication(session.communicationHistory) ? (
              <div className="mb-4 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-[11px] text-slate-300">
                Last comm: {getLatestCommunication(session.communicationHistory)?.summary}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void handleJoinAssist(session)}
              className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/20"
            >
              Join and Assist
            </button>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="mb-3 text-sm font-semibold text-white">
            Communication History ({selectedSession.sessionId})
          </div>
          {conversationSummary ? (
            <div className="mb-3 rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-[11px] text-slate-300">
              Total tracked conversation events: {conversationSummary.total ?? 0}
            </div>
          ) : null}
          <div className="space-y-2">
            {communicationFeed.map((event) => (
              <div
                key={`${selectedSession.sessionId}-${event.timestamp}-${event.summary}`}
                className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-200"
              >
                <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {event.timestamp} • {event.channel} • {event.direction}
                </div>
                <div>{event.summary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="mb-3 text-sm font-semibold text-white">
            Messaging & Appointment Settings
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Appointment Confirmation ({DEFAULT_SETTINGS.confirmationSendWindowHours}h window)
              </div>
              <div>{DEFAULT_SETTINGS.confirmationTemplate}</div>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Same-Day Reminder ({DEFAULT_SETTINGS.sameDayReminderHour})
              </div>
              <div>{DEFAULT_SETTINGS.reminderTemplate}</div>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Post-Visit Follow-up
              </div>
              <div>{siteConfig?.greetingMessage || DEFAULT_SETTINGS.postVisitTemplate}</div>
              <div className="mt-2 text-[11px] text-slate-400">
                Positive route: Google review link. Negative route: capture internal feedback only.
              </div>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Plan & Telephony Readiness
              </div>
              <div>
                Plan: {(siteConfig?.plan || "free").toUpperCase()} •{" "}
                {siteConfig?.provisionedPhoneNumber
                  ? `Phone active ${siteConfig.provisionedPhoneNumber}`
                  : "No provisioned number"}
              </div>
              {!siteConfig?.provisionedPhoneNumber ? (
                <button
                  type="button"
                  onClick={() => void handleActivateTelephony()}
                  className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                >
                  Activate Twilio Phone
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                Assisted Session Controls
              </div>
              <div className="mb-2 text-[11px] text-slate-300">
                Active session: {selectedSession.sessionId} ({selectedSession.workflowState})
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleVerificationState(selectedSession, "required")}
                  className="rounded border border-slate-600/60 bg-slate-700/60 px-2 py-1 text-[11px] text-slate-100"
                >
                  Verification Required
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerificationState(selectedSession, "otp_sent")}
                  className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
                >
                  OTP Sent
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerificationState(selectedSession, "verified")}
                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                >
                  Mark Verified
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerificationState(selectedSession, "failed")}
                  className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                >
                  Mark Failed
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerificationState(selectedSession, "bypass_allowed")}
                  className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200"
                >
                  Allow Bypass
                </button>
                <button
                  type="button"
                  onClick={() => void handleEndAssist(selectedSession)}
                  className="rounded border border-slate-600/60 bg-slate-700/60 px-2 py-1 text-[11px] text-slate-100"
                >
                  End Assist
                </button>
                <select
                  value={outcomeType}
                  onChange={(event) => setOutcomeType(event.target.value as OutcomeType)}
                  className="rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-[11px] text-slate-100"
                >
                  <option value="booking">booking</option>
                  <option value="lead">lead</option>
                  <option value="task">task</option>
                  <option value="resolved_no_action">resolved_no_action</option>
                  <option value="escalated">escalated</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleResolveOutcome(selectedSession)}
                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                >
                  Resolve Outcome
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Outcome Summary (Today)</div>
          <div className="text-[11px] text-slate-400">Updated {outcomeSummary.lastUpdatedAt}</div>
        </div>
        <div className="mb-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
          <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-200">
            Resolved: <span className="font-semibold text-white">{outcomeSummary.totalResolved}</span>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            Bookings: <span className="font-semibold">{outcomeSummary.bookings}</span>
          </div>
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
            Leads: <span className="font-semibold">{outcomeSummary.leads}</span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
            Tasks: <span className="font-semibold">{outcomeSummary.tasks}</span>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Escalations: <span className="font-semibold">{outcomeSummary.escalations}</span>
          </div>
          <div className="rounded-lg border border-slate-600/40 bg-slate-800/60 px-3 py-2 text-xs text-slate-200">
            No Action: <span className="font-semibold text-white">{outcomeSummary.resolvedNoAction}</span>
          </div>
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
            Operator Joined: <span className="font-semibold">{outcomeSummary.operatorJoinedCount}</span>
          </div>
        </div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Live Snapshot</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-200">
            Active Sessions: <span className="font-semibold text-white">{outcomeSummary.activeSessions}</span>
          </div>
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
            Operator Joined Now: <span className="font-semibold">{outcomeSummary.operatorJoinedNow}</span>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            Waiting For Assist: <span className="font-semibold">{outcomeSummary.waitingForAssist}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Google Reviews (Last 5)</div>
          <div className="text-[11px] text-slate-400">Daily refresh</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {reviewSnapshots.map((review) => (
            <div
              key={`${review.author}-${review.createdAt}`}
              className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200"
            >
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                {review.author} • {review.createdAt}
              </div>
              <div className="mb-2 text-amber-300">{"★".repeat(review.rating)}</div>
              <div>{review.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="mb-3 text-sm font-semibold text-white">
          Tools · Client Router / QR Code Generator / AI Biz Bot Consultant
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Download and customize both website QR and route QR assets from the Front Desk.
        </p>
        {qrLoading ? (
          <div className="text-sm text-slate-400">Loading QR tools...</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Website QR
              </div>
              <div className="mb-2 text-[11px] text-slate-400">
                Destination:{" "}
                {siteConfig?.slug ? `/biz/${siteConfig.slug}` : "No slug assigned yet"}
              </div>
              {websiteQrImageUrl ? (
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={websiteQrImageUrl}
                    alt="Website QR"
                    className="h-24 w-24 rounded border border-slate-700 bg-white p-1"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadQr(
                          websiteQrImageUrl,
                          `website-qr-${siteConfig?.slug ?? siteId}.png`
                        )
                      }
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 hover:bg-indigo-500/20"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGenerateWebsiteQr()}
                      className="rounded-lg border border-slate-600/60 bg-slate-700/60 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleGenerateWebsiteQr()}
                  className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 hover:bg-indigo-500/20"
                >
                  Generate Website QR
                </button>
              )}
            </div>

            <div className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Route QR (Shadow Telecom)
              </div>
              <div className="space-y-3">
                {qrRoutes.length === 0 ? (
                  <div className="text-xs text-slate-400">
                    No route QR yet. Use the QR manager to create one.
                  </div>
                ) : (
                  qrRoutes.map((route) => (
                    <div
                      key={route.id}
                      className="rounded-lg border border-slate-700/70 bg-slate-900/50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                        <span>Route #{route.id}</span>
                        <span>{route.isActive ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="mb-2 text-[11px] text-slate-400">{route.routeUrl}</div>
                      <input
                        type="text"
                        defaultValue={route.destination ?? ""}
                        onBlur={(event) =>
                          void handleUpdateRoute(route.id, {
                            destination: event.target.value || null,
                          })
                        }
                        placeholder="Destination URL"
                        className="mb-2 w-full rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-xs text-white placeholder:text-slate-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateRoute(route.id, { isActive: !route.isActive })
                          }
                          className="rounded border border-slate-600/60 bg-slate-700/60 px-2 py-1 text-[11px] text-slate-100"
                        >
                          {route.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleDownloadQr(
                              `/api/qr-routes/${route.id}/image`,
                              `route-qr-${route.id}.png`
                            )
                          }
                          className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-100"
                        >
                          Download QR
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <a
                  href="/platform/tools/qr-codes"
                  className="inline-block text-xs text-indigo-300 hover:text-indigo-200"
                >
                  Open full QR Code Manager
                </a>
              </div>
            </div>
          </div>
        )}
        {qrMessage ? <div className="mt-3 text-xs text-slate-300">{qrMessage}</div> : null}
      </div>
    </div>
  );
}
