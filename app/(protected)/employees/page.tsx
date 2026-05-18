"use client";

import { useMemo } from "react";
import { useData } from "@/components/data-provider";
import { RiskBadge } from "@/components/risk-badge";
import { Card } from "@/components/ui/card";
import type { RiskLevel } from "@/types";

export default function EmployeesPage() {
  const { employees, apps } = useData();
  const appByName = useMemo(() => new Map(apps.map((app) => [app.toolName, app])), [apps]);

  function highestRisk(tools: string[]): RiskLevel {
    const order: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
    return tools.reduce<RiskLevel>((max, tool) => {
      const level = appByName.get(tool)?.riskLevel ?? "LOW";
      return order.indexOf(level) > order.indexOf(max) ? level : max;
    }, "LOW");
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Employee Exposure</p>
        <h1 className="mt-2 text-3xl font-black">People With Shadow SaaS Access</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((employee) => {
          const riskyTools = employee.tools.filter((tool) => ["HIGH", "MEDIUM"].includes(appByName.get(tool)?.riskLevel ?? "LOW"));
          const highest = highestRisk(employee.tools);
          const highestTool = employee.tools.find((tool) => appByName.get(tool)?.riskLevel === highest) ?? employee.tools[0];
          return (
            <Card key={employee.email} className="transition hover:-translate-y-1 hover:border-cyan-400/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{employee.email}</h2>
                  <p className="mt-1 text-sm text-slate-400">{employee.department}</p>
                </div>
                <RiskBadge level={highest} />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-slate-900/80 p-3">
                  <dt className="text-slate-500">Risky tools</dt>
                  <dd className="mt-1 text-2xl font-black">{riskyTools.length}</dd>
                </div>
                <div className="rounded-md bg-slate-900/80 p-3">
                  <dt className="text-slate-500">Total tools</dt>
                  <dd className="mt-1 text-2xl font-black">{employee.tools.length}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-slate-300">Highest risk tool: <span className="font-semibold text-white">{highestTool}</span></p>
            </Card>
          );
        })}
      </div>
      {employees.length === 0 && <Card><p className="text-sm text-slate-400">No employee exposure data yet. Load the demo incident or upload a dataset.</p></Card>}
    </div>
  );
}
