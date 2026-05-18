"use client";

import axios from "axios";
import { Download, RefreshCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Tab = "apps" | "employees" | "alerts" | "events" | "access" | "stats" | "controls";

const tabs: { key: Tab; label: string }[] = [
  { key: "apps", label: "Apps" },
  { key: "employees", label: "Employees" },
  { key: "alerts", label: "Alerts" },
  { key: "events", label: "Events" },
  { key: "access", label: "Access Requests" },
  { key: "stats", label: "Stats" },
  { key: "controls", label: "Controls" }
];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${String(Array.isArray(value) ? value.join(";") : value ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\n");
}

export default function DatabasePage() {
  const { apps, employees, alerts, events, accessRequests, refresh, loadDemo } = useData();
  const [tab, setTab] = useState<Tab>("apps");
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const map = { apps, employees, alerts, events, access: accessRequests, stats: [{ apps: apps.length, employees: employees.length, alerts: alerts.length, events: events.length, accessRequests: accessRequests.length }], controls: [] };
    return map[tab] as Record<string, unknown>[];
  }, [accessRequests, alerts, apps, employees, events, tab]);

  const filtered = useMemo(() => data.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [data, query]);

  async function remove(row: Record<string, unknown>) {
    if (!row._id || tab === "stats" || tab === "controls") return;
    await axios.delete(`/api/${tab === "access" ? "access" : tab}/${row._id}`);
    await refresh();
  }

  async function reset() {
    await axios.post("/api/reset");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Persistent Storage</p>
        <h1 className="mt-2 text-3xl font-black">Database</h1>
      </header>
      <Card>
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto_auto]">
          <Select value={tab} onChange={(event) => setTab(event.target.value as Tab)}>
            {tabs.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </Select>
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="pl-9" placeholder="Search JSON" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Button variant="secondary" onClick={() => download(`${tab}.json`, JSON.stringify(filtered, null, 2), "application/json")}><Download size={16} /> JSON</Button>
          <Button variant="secondary" onClick={() => download(`${tab}.csv`, toCsv(filtered), "text/csv")}><Download size={16} /> CSV</Button>
        </div>
      </Card>

      {tab === "controls" ? (
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button onClick={loadDemo}><RefreshCcw size={16} /> Load Demo</Button>
            <Button variant="secondary" onClick={reset}><Trash2 size={16} /> Reset Database</Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Record JSON</th><th className="w-28 px-4 py-3">Delete</th></tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => (
                  <tr key={String(row._id ?? index)} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="px-4 py-4"><pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(row, null, 2)}</pre></td>
                    <td className="px-4 py-4">{Boolean(row._id) && <Button variant="secondary" className="h-8 px-3" onClick={() => remove(row)}><Trash2 size={14} /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-6 text-sm text-slate-400">No records match the current filter.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
