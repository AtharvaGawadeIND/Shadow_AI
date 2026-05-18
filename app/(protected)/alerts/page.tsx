"use client";

import { AlertTriangle, Mail, MessageSquare, MonitorDot } from "lucide-react";
import { useData } from "@/components/data-provider";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const iconByChannel = {
  "in-app": MonitorDot,
  email: Mail,
  slack: MessageSquare
};

export default function AlertsPage() {
  const { alerts } = useData();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Alert Center</p>
        <h1 className="mt-2 text-3xl font-black">High-Risk SaaS Alerts</h1>
      </header>
      <div className="grid gap-4">
        {alerts.map((alert, index) => {
          const Icon = iconByChannel[alert.channel];
          return (
            <Card key={`${alert.tool}-${alert.employee}-${alert.channel}-${index}`} className="border-rose-400/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-rose-500/15 text-rose-300">
                    <AlertTriangle />
                  </span>
                  <div>
                    <p className="font-semibold">{alert.message}</p>
                    <p className="mt-1 text-sm text-slate-400">{alert.tool} • {alert.employee} • {formatDate(alert.timestamp)}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-sm text-slate-300">
                  <Icon size={15} /> {alert.channel} simulation
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      {alerts.length === 0 && <Card><p className="text-sm text-slate-400">No alerts yet. High-risk detections will appear here and simulate email plus Slack delivery.</p></Card>}
    </div>
  );
}
