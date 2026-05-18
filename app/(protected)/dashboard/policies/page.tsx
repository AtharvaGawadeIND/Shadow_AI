"use client";

import axios from "axios";
import { Edit, Plus, Power, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AccessPolicy, PolicyAction, PolicyScope } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

type FormState = {
  domain: string;
  toolName: string;
  scope: PolicyScope;
  employeeEmail: string;
  action: PolicyAction;
  reason: string;
};

const emptyForm: FormState = {
  domain: "",
  toolName: "",
  scope: "global",
  employeeEmail: "",
  action: "block",
  reason: ""
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [action, setAction] = useState("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadPolicies() {
    const response = await axios.get("/api/policies");
    setPolicies(response.data.policies);
  }

  useEffect(() => {
    loadPolicies().catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return policies.filter((policy) => {
      const matchesQuery = !search || policy.domain.includes(search) || (policy.employeeEmail ?? "").includes(search);
      return matchesQuery && (scope === "all" || policy.scope === scope) && (action === "all" || policy.action === action);
    });
  }, [action, policies, query, scope]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editPolicy(policy: AccessPolicy) {
    setEditingId(policy._id ?? null);
    setForm({
      domain: policy.domain,
      toolName: policy.toolName,
      scope: policy.scope,
      employeeEmail: policy.employeeEmail ?? "",
      action: policy.action,
      reason: policy.reason
    });
  }

  async function savePolicy(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, employeeEmail: form.scope === "user" ? form.employeeEmail : "" };
    try {
      if (editingId) {
        await axios.patch(`/api/policies/${editingId}`, payload);
      } else {
        await axios.post("/api/policies", payload);
      }
      resetForm();
      await loadPolicies();
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy(policy: AccessPolicy) {
    if (!policy._id || !window.confirm(`Delete policy for ${policy.domain}?`)) return;
    await axios.delete(`/api/policies/${policy._id}`);
    await loadPolicies();
  }

  async function togglePolicy(policy: AccessPolicy) {
    if (!policy._id) return;
    await axios.patch(`/api/policies/${policy._id}/toggle`);
    await loadPolicies();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Policy engine</p>
          <h1 className="mt-2 text-3xl font-black">Enterprise Access Policies</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Manually block or allow SaaS access globally or for individual employees.</p>
        </div>
        <Button onClick={resetForm}>
          <Plus size={16} /> Add Policy
        </Button>
      </header>

      <Card>
        <form onSubmit={savePolicy} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input required placeholder="Domain" value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} />
            <Input required placeholder="Tool name" value={form.toolName} onChange={(event) => setForm({ ...form, toolName: event.target.value })} />
            <Select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as PolicyScope })}>
              <option value="global">Global</option>
              <option value="user">User</option>
            </Select>
            <Select value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value as PolicyAction })}>
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </Select>
          </div>
          {form.scope === "user" && (
            <Input required type="email" placeholder="Employee email" value={form.employeeEmail} onChange={(event) => setForm({ ...form, employeeEmail: event.target.value })} />
          )}
          <textarea
            className="min-h-24 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            placeholder="Reason"
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={saving} type="submit">{saving ? "Saving..." : "Save"}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              <X size={16} /> Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="pl-9" placeholder="Search domain or employee" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All scopes</option>
            <option value="global">Global</option>
            <option value="user">User</option>
          </Select>
          <Select value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="all">All actions</option>
            <option value="block">Block</option>
            <option value="allow">Allow</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {["Domain", "Tool", "Scope", "Employee", "Action", "Reason", "Active", "Created", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((policy) => (
                <tr key={policy._id ?? `${policy.domain}-${policy.employeeEmail}-${policy.action}`} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-4 py-4 font-semibold">{policy.domain}</td>
                  <td className="px-4 py-4 text-slate-300">{policy.toolName}</td>
                  <td className="px-4 py-4 capitalize">{policy.scope}</td>
                  <td className="px-4 py-4 text-slate-300">{policy.employeeEmail || "-"}</td>
                  <td className="px-4 py-4">
                    <span className={policy.action === "block" ? "text-rose-300" : "text-emerald-300"}>{policy.action}</span>
                  </td>
                  <td className="max-w-[280px] px-4 py-4 text-slate-400">{policy.reason || "-"}</td>
                  <td className="px-4 py-4">{policy.active ? "enabled" : "disabled"}</td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(policy.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button title="Edit" variant="secondary" className="h-8 w-8 px-0" onClick={() => editPolicy(policy)}><Edit size={14} /></Button>
                      <Button title={policy.active ? "Disable" : "Enable"} variant="secondary" className="h-8 w-8 px-0" onClick={() => togglePolicy(policy)}><Power size={14} /></Button>
                      <Button title="Delete" variant="danger" className="h-8 w-8 px-0" onClick={() => deletePolicy(policy)}><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-sm text-slate-400">No policies match the current filters.</p>}
        </div>
      </Card>
    </div>
  );
}
