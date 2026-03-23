import React from "react";
import {
  Activity,
  DollarSign,
  Users,
  PhoneCall,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CalendarCheck,
} from "lucide-react";

interface StartScreenViewProps {
  siteId: string;
}

const StatCard = ({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: any;
  colorClass: string;
}) => (
  <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-6 backdrop-blur-xl">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className={`rounded-lg p-2 ${colorClass} bg-opacity-10`}>
        <Icon size={20} className={colorClass.replace("bg-", "text-")} />
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      {trendUp ? (
        <ArrowUpRight size={16} className="text-emerald-400" />
      ) : (
        <ArrowDownRight size={16} className="text-rose-400" />
      )}
      <span className={`text-xs font-medium ${trendUp ? "text-emerald-400" : "text-rose-400"}`}>
        {trend}
      </span>
      <span className="text-xs text-slate-500">vs last month</span>
    </div>
  </div>
);

export function StartScreenView({ siteId }: StartScreenViewProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mission Control</h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time operational overview for {siteId || "The Joint Chiropractic"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$124,500"
          trend="+12.5%"
          trendUp={true}
          icon={DollarSign}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Active Members"
          value="1,240"
          trend="+4.2%"
          trendUp={true}
          icon={Users}
          colorClass="bg-indigo-500"
        />
        <StatCard
          title="Voice AI Calls"
          value="8,432"
          trend="+24.0%"
          trendUp={true}
          icon={PhoneCall}
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Avg Wait Time"
          value="4m 12s"
          trend="-1.5%"
          trendUp={true} // Good trend for wait time
          icon={Clock}
          colorClass="bg-amber-500"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Live Agent Status */}
        <div className="col-span-2 rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Live Agent Status</h3>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-medium text-emerald-400">System Operational</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { name: "Front Desk AI", status: "Active", calls: 12, uptime: "99.9%" },
              { name: "Booking Agent", status: "Active", calls: 8, uptime: "99.9%" },
              { name: "Support Bot", status: "Idle", calls: 0, uptime: "99.9%" },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                    <Activity size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{agent.name}</h4>
                    <p className="text-xs text-slate-400">Uptime: {agent.uptime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Active Calls</p>
                    <p className="text-sm font-bold text-white">{agent.calls}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    agent.status === "Active" 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : "bg-slate-700/50 text-slate-400"
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-6 backdrop-blur-xl">
          <h3 className="mb-6 text-lg font-bold text-white">Recent Activity</h3>
          <div className="relative space-y-6 before:absolute before:left-2 before:top-2 before:h-full before:w-px before:bg-slate-800">
            {[
              { time: "10:42 AM", event: "New appointment booked", detail: "Sarah J. - Adjustment", icon: CalendarCheck, color: "text-emerald-400" },
              { time: "10:38 AM", event: "Missed call handled", detail: "AI Agent captured lead", icon: PhoneCall, color: "text-blue-400" },
              { time: "10:15 AM", event: "New member signup", detail: "Wellness Plan Gold", icon: Users, color: "text-indigo-400" },
              { time: "09:55 AM", event: "System alert", detail: "High call volume detected", icon: Activity, color: "text-amber-400" },
            ].map((item, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 ring-4 ring-slate-900">
                  <div className={`h-2 w-2 rounded-full ${item.color.replace("text-", "bg-")}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500">{item.time}</span>
                  <span className="text-sm font-medium text-white">{item.event}</span>
                  <span className="text-xs text-slate-400">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
