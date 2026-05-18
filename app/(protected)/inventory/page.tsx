"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import axios from "axios";
import { useData } from "@/components/data-provider";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export default function InventoryPage() {
  const { apps, employees, refresh } = useData();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("all");
  const [category, setCategory] = useState("all");
  const [department, setDepartment] = useState("all");

  const departmentByEmail = useMemo(() => new Map(employees.map((employee) => [employee.email, employee.department])), [employees]);
  const departments = useMemo(() => Array.from(new Set(employees.map((employee) => employee.department))), [employees]);

  const filtered = apps.filter((app) => {
    const matchesQuery =
      app.toolName.toLowerCase().includes(query.toLowerCase()) ||
      app.employeesAffected.some((email) => email.toLowerCase().includes(query.toLowerCase()));
    return (
      matchesQuery &&
      (risk === "all" || app.riskLevel === risk) &&
      (category === "all" || app.category === category) &&
      (department === "all" || app.employeesAffected.some((email) => departmentByEmail.get(email) === department))
    );
  });

  const categories = Array.from(new Set(apps.map((app) => app.category)));

  async function updateApproval(domain: string, approved: boolean) {
    await axios.patch(`/api/apps/${encodeURIComponent(domain)}`, { approved });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">SaaS Inventory</p>
        <h1 className="mt-2 text-3xl font-black">Unauthorized App Register</h1>
      </header>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_150px_170px_170px]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="pl-9" placeholder="Search app or employee" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <Select value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="all">All risks</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {["Tool", "Domain", "Category", "Risk", "Employees", "Permissions", "First Detected", "Status", "Policy"].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={`${app.toolName}-${app.domain}`} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-4 py-4 font-semibold">{app.toolName}</td>
                  <td className="px-4 py-4 text-slate-300">{app.domain}</td>
                  <td className="px-4 py-4">{app.category}</td>
                  <td className="px-4 py-4"><RiskBadge level={app.riskLevel} /></td>
                  <td className="px-4 py-4">{app.employeesAffected.length}</td>
                  <td className="px-4 py-4 text-slate-400">{app.permissions.join(", ")}</td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(app.firstDetected)}</td>
                  <td className="px-4 py-4">
                    <span className={app.approved ? "text-emerald-300" : "text-rose-300"}>{app.approved ? "approved" : "unapproved"}</span>
                  </td>
                  <td className="px-4 py-4">
                    {app.approved ? (
                      <Button variant="secondary" className="h-8 px-3" onClick={() => updateApproval(app.domain, false)}>Revoke</Button>
                    ) : (
                      <Button className="h-8 px-3" onClick={() => updateApproval(app.domain, true)}>Approve</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-sm text-slate-400">No applications match the current filters.</p>}
        </div>
      </Card>
    </div>
  );
}
