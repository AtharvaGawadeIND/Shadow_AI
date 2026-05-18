"use client";

import axios from "axios";
import { Check, X } from "lucide-react";
import { useData } from "@/components/data-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function AccessRequestsPage() {
  const { accessRequests, refresh } = useData();

  async function updateRequest(id: string | undefined, action: "approve" | "reject") {
    if (!id) return;
    await axios.patch(`/api/access/${id}/${action}`);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Employee Workflow</p>
        <h1 className="mt-2 text-3xl font-black">Access Requests</h1>
      </header>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-400">
              <tr>{["Employee", "Tool", "Domain", "Reason", "Status", "Requested", "Actions"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
            </thead>
            <tbody>
              {accessRequests.map((request) => (
                <tr key={request._id ?? `${request.employee}-${request.domain}-${request.requestedAt}`} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="px-4 py-4 font-semibold">{request.employee}</td>
                  <td className="px-4 py-4">{request.tool}</td>
                  <td className="px-4 py-4 text-slate-300">{request.domain}</td>
                  <td className="px-4 py-4 text-slate-300">{request.reason}</td>
                  <td className="px-4 py-4"><span className={request.status === "APPROVED" ? "text-emerald-300" : request.status === "REJECTED" ? "text-rose-300" : "text-amber-300"}>{request.status}</span></td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(request.requestedAt)}</td>
                  <td className="px-4 py-4">
                    {request.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button className="h-8 px-3" onClick={() => updateRequest(request._id, "approve")}><Check size={14} /> Approve</Button>
                        <Button variant="secondary" className="h-8 px-3" onClick={() => updateRequest(request._id, "reject")}><X size={14} /> Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accessRequests.length === 0 && <p className="p-6 text-sm text-slate-400">No employee access requests yet.</p>}
        </div>
      </Card>
    </div>
  );
}
