/**
 * client/src/pages/reseller/ResellerAnalytics.tsx
 *
 * Demo analytics view for the Mixing Board — rendered inside the Analytics tab.
 * Uses mock data to show immediate value during Las Vegas demos before live
 * data pipelines are wired.
 *
 * DEMO DATA — replace with live pipeline queries when ready.
 */

import { Badge } from "@/components/ui/badge";
import {
  Users,
  Phone,
  Mail,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  MessageSquare,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

// ─── DEMO DATA — replace with live pipeline ───────────────────────────────────

const MOCK_LEADS = [
  {
    id: "l1",
    name: "Marcus Rivera",
    source: "Voice Concierge",
    property: "Summerlin Estates — 4BR",
    quality: 92,
    status: "hot",
    time: "2 min ago",
    phone: "+1 702-555-0191",
  },
  {
    id: "l2",
    name: "Priya Nair",
    source: "Chat Widget",
    property: "Henderson Luxury — 3BR",
    quality: 78,
    status: "warm",
    time: "14 min ago",
    phone: "+1 702-555-0284",
  },
  {
    id: "l3",
    name: "Derek Fontaine",
    source: "Voice Concierge",
    property: "Downtown High-Rise — 2BR",
    quality: 85,
    status: "hot",
    time: "31 min ago",
    phone: "+1 702-555-0372",
  },
  {
    id: "l4",
    name: "Sofia Marchetti",
    source: "SMS",
    property: "Green Valley — 5BR",
    quality: 61,
    status: "warm",
    time: "1 hr ago",
    phone: "+1 702-555-0455",
  },
  {
    id: "l5",
    name: "James Okafor",
    source: "Chat Widget",
    property: "Anthem — 3BR",
    quality: 44,
    status: "cold",
    time: "2 hr ago",
    phone: "+1 702-555-0538",
  },
];

const MOCK_CONTACTS = [
  {
    id: "c1",
    name: "Marcus Rivera",
    email: "m.rivera@email.com",
    phone: "+1 702-555-0191",
    lastContact: "Today",
    stage: "Showing Scheduled",
  },
  {
    id: "c2",
    name: "Priya Nair",
    email: "p.nair@email.com",
    phone: "+1 702-555-0284",
    lastContact: "Today",
    stage: "Follow-up Needed",
  },
  {
    id: "c3",
    name: "Elena Vasquez",
    email: "e.vasquez@email.com",
    phone: "+1 702-555-0619",
    lastContact: "Yesterday",
    stage: "Offer Submitted",
  },
  {
    id: "c4",
    name: "Thomas Brecht",
    email: "t.brecht@email.com",
    phone: "+1 702-555-0723",
    lastContact: "2 days ago",
    stage: "Under Contract",
  },
  {
    id: "c5",
    name: "Aisha Kamara",
    email: "a.kamara@email.com",
    phone: "+1 702-555-0847",
    lastContact: "3 days ago",
    stage: "Nurture",
  },
];

const MOCK_TASKS = [
  {
    id: "t1",
    title: "Call Marcus Rivera — confirm showing at 2PM",
    priority: "high",
    due: "Today 1:00 PM",
    done: false,
  },
  {
    id: "t2",
    title: "Send Priya Nair — listing comparison PDF",
    priority: "high",
    due: "Today 3:00 PM",
    done: false,
  },
  {
    id: "t3",
    title: "Follow up: Thomas Brecht inspection results",
    priority: "medium",
    due: "Tomorrow 10:00 AM",
    done: false,
  },
  {
    id: "t4",
    title: "Send Elena Vasquez — counteroffer docs",
    priority: "high",
    due: "Tomorrow 12:00 PM",
    done: false,
  },
  {
    id: "t5",
    title: "Weekly nurture SMS blast — cold leads",
    priority: "low",
    due: "Friday 9:00 AM",
    done: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qualityColor(q: number) {
  if (q >= 80) return "text-emerald-400";
  if (q >= 60) return "text-yellow-400";
  return "text-gray-500";
}

function statusBadge(status: string) {
  if (status === "hot")
    return (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Hot</Badge>
    );
  if (status === "warm")
    return (
      <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
        Warm
      </Badge>
    );
  return (
    <Badge className="bg-gray-500/10 text-gray-500 border-gray-600/20 text-xs">Cold</Badge>
  );
}

function priorityIcon(priority: string) {
  if (priority === "high") return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  if (priority === "medium") return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
  return <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "indigo",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`p-1.5 rounded-lg border ${accentMap[accent]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ResellerAnalyticsProps {
  siteId: string;
  siteName: string;
}

export default function ResellerAnalytics({ siteName }: ResellerAnalyticsProps) {
  const hotLeads = MOCK_LEADS.filter((l) => l.status === "hot").length;
  const avgQuality = Math.round(
    MOCK_LEADS.reduce((sum, l) => sum + l.quality, 0) / MOCK_LEADS.length
  );
  const openTasks = MOCK_TASKS.filter((t) => !t.done).length;

  return (
    <div className="space-y-6">
      {/* Demo data banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
        <Star className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>Demo mode</strong> — showing mock data for {siteName || "this site"}.
          Connect live data pipelines to replace.
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Leads"
          value={MOCK_LEADS.length}
          sub="Last 24 hours"
          accent="indigo"
        />
        <StatCard
          icon={TrendingUp}
          label="Hot Leads"
          value={hotLeads}
          sub={`${Math.round((hotLeads / MOCK_LEADS.length) * 100)}% of pipeline`}
          accent="red"
        />
        <StatCard
          icon={Star}
          label="Avg Quality"
          value={`${avgQuality}%`}
          sub="AI qualification score"
          accent="yellow"
        />
        <StatCard
          icon={CalendarCheck}
          label="Open Tasks"
          value={openTasks}
          sub={`${MOCK_TASKS.filter((t) => t.done).length} completed today`}
          accent="emerald"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-200">Recent Leads</h3>
          </div>
          <div className="space-y-3">
            {MOCK_LEADS.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-700/40 hover:border-gray-600/60 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {lead.name}
                    </p>
                    {statusBadge(lead.status)}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{lead.property}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{lead.source} · {lead.time}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className={`text-lg font-bold ${qualityColor(lead.quality)}`}>
                    {lead.quality}
                  </p>
                  <p className="text-xs text-gray-600">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-200">Tasks</h3>
          </div>
          <div className="space-y-3">
            {MOCK_TASKS.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  task.done
                    ? "bg-gray-900/20 border-gray-800/40 opacity-50"
                    : "bg-gray-800/40 border-gray-700/40 hover:border-gray-600/60"
                }`}
              >
                <div className="mt-0.5 shrink-0">{priorityIcon(task.priority)}</div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      task.done
                        ? "line-through text-gray-600"
                        : "text-gray-200"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{task.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-200">Contacts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="text-left pb-3 font-medium">Name</th>
                <th className="text-left pb-3 font-medium">Contact</th>
                <th className="text-left pb-3 font-medium">Last Touch</th>
                <th className="text-left pb-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {MOCK_CONTACTS.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 text-gray-200 font-medium">{c.name}</td>
                  <td className="py-3">
                    <p className="text-gray-400">{c.email}</p>
                    <p className="text-gray-500 text-xs">{c.phone}</p>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{c.lastContact}</td>
                  <td className="py-3">
                    <Badge
                      variant="outline"
                      className="text-xs border-gray-700 text-gray-400"
                    >
                      {c.stage}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity footer */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-200">AI Interaction Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Voice Sessions", value: "47", delta: "+12 today" },
            { label: "Chat Messages", value: "312", delta: "+89 today" },
            { label: "SMS Sent", value: "28", delta: "A2P compliant" },
            { label: "Avg Session", value: "4m 12s", delta: "↑ 18% vs last week" },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-gray-800/30 rounded-xl">
              <p className="text-xl font-bold text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{s.delta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
