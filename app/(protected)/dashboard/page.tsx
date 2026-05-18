"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, Users, Workflow } from "lucide-react";
import { useData } from "@/components/data-provider";
import { CategoryBar, ExposureHeatmap, RiskPie } from "@/components/dashboard-charts";
import { RecentTimeline } from "@/components/recent-timeline";
import { UploadPanel } from "@/components/upload-panel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { apps, employees, alerts, loading } = useData();
  const stats = [
    { label: "Detected Apps", value: apps.length, icon: Workflow },
    { label: "Employees Affected", value: employees.length, icon: Users },
    { label: "High Risk Apps", value: apps.filter((app) => app.riskLevel === "HIGH").length, icon: AlertTriangle },
    { label: "Medium Risk Apps", value: apps.filter((app) => app.riskLevel === "MEDIUM").length, icon: ShieldCheck },
    { label: "Low Risk Apps", value: apps.filter((app) => app.riskLevel === "LOW").length, icon: ShieldCheck },
    { label: "Alerts Generated", value: alerts.length, icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Exposure command center</p>
          <h1 className="mt-2 text-3xl font-black">ShadowShield AI Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Detect unauthorized SaaS adoption, score vendor risk, and prioritize admin response.</p>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card className="h-full">
                <stat.icon className="mb-5 text-cyan-300" size={22} />
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <RiskPie apps={apps} />
          <CategoryBar apps={apps} />
          <ExposureHeatmap apps={apps} employees={employees} />
          <RecentTimeline alerts={alerts} />
        </div>
        <UploadPanel />
      </div>
    </div>
  );
}
