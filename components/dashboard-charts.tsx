"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Employee, SaaSApp } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";

const colors = { LOW: "#34d399", MEDIUM: "#fbbf24", HIGH: "#fb7185" };

export function RiskPie({ apps }: { apps: SaaSApp[] }) {
  const data = ["LOW", "MEDIUM", "HIGH"].map((level) => ({
    name: level,
    value: apps.filter((app) => app.riskLevel === level).length
  }));
  return (
    <Card>
      <CardHeader><CardTitle>Risk Distribution</CardTitle></CardHeader>
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4} label={({ name, value }) => `${name} ${value}`}>
              {data.map((entry) => <Cell key={entry.name} fill={colors[entry.name as keyof typeof colors]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CategoryBar({ apps }: { apps: SaaSApp[] }) {
  const groups = apps.reduce<Record<string, number>>((acc, app) => {
    acc[app.category] = (acc[app.category] ?? 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(groups).map(([category, count]) => ({ category, count }));
  return (
    <Card>
      <CardHeader><CardTitle>SaaS Category Exposure</CardTitle></CardHeader>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
            <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="count" position="top" fill="#e2e8f0" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ExposureHeatmap({ employees, apps }: { employees: Employee[]; apps: SaaSApp[] }) {
  const riskByTool = new Map(apps.map((app) => [app.toolName, app.riskLevel]));
  return (
    <Card>
      <CardHeader><CardTitle>Employee Exposure Heatmap</CardTitle></CardHeader>
      <div className="grid gap-2">
        {employees.slice(0, 10).map((employee) => (
          <div key={employee.email} className="grid grid-cols-[minmax(120px,1fr)_2fr] items-center gap-3">
            <span className="truncate text-xs text-slate-400">{employee.email}</span>
            <div className="flex gap-1">
              {employee.tools.map((tool) => {
                const risk = riskByTool.get(tool) ?? "LOW";
                return (
                  <span
                    title={`${tool}: ${risk}`}
                    key={tool}
                    className="h-6 flex-1 rounded-sm"
                    style={{ background: risk === "HIGH" ? "#fb7185" : risk === "MEDIUM" ? "#fbbf24" : "#34d399" }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
