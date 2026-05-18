"use client";

import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import { RiskBadge } from "@/components/risk-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

const decisionClass = {
  ALLOW: "text-emerald-300",
  WARN: "text-amber-300",
  BLOCK: "text-rose-300"
};

export default function EventsPage() {
  const { events } = useData();
  const [decision, setDecision] = useState("all");
  const [employee, setEmployee] = useState("");
  const [domain, setDomain] = useState("");

  const filtered = useMemo(() => {
    return events.filter((event) => {
      return (
        (decision === "all" || event.decision === decision) &&
        event.employeeEmail.toLowerCase().includes(employee.toLowerCase()) &&
        event.domain.toLowerCase().includes(domain.toLowerCase())
      );
    });
  }, [decision, domain, employee, events]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Real-Time Browser Control</p>
          <h1 className="mt-2 text-3xl font-black">Live Access Events</h1>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-slate-400">
          <Activity size={16} className="text-cyan-300" />
          Auto-refreshing every 3 seconds
        </div>
      </header>

      <Card>
        <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr]">
          <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="all">All decisions</option>
            <option value="ALLOW">Allow</option>
            <option value="WARN">Warn</option>
            <option value="BLOCK">Block</option>
          </Select>
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="pl-9" placeholder="Filter employee" value={employee} onChange={(e) => setEmployee(e.target.value)} />
          </label>
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="pl-9" placeholder="Filter domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {["Employee", "Domain", "Decision", "Risk", "Timestamp", "Reason"].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, index) => (
                <tr key={`${event.employeeEmail}-${event.domain}-${event.timestamp}-${index}`} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-4 py-4 font-semibold">{event.employeeEmail}</td>
                  <td className="px-4 py-4 text-slate-300">{event.domain}</td>
                  <td className={`px-4 py-4 font-black ${decisionClass[event.decision]}`}>{event.decision}</td>
                  <td className="px-4 py-4"><RiskBadge level={event.riskLevel} /> <span className="ml-2 text-slate-400">{event.riskScore}</span></td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(event.timestamp)}</td>
                  <td className="px-4 py-4 text-slate-300">{event.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-sm text-slate-400">No browser access events match the current filters.</p>}
        </div>
      </Card>
    </div>
  );
}
