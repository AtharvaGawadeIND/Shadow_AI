import type { Alert } from "@/types";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { formatDate } from "@/lib/utils";

export function RecentTimeline({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Recent Activity Timeline</CardTitle></CardHeader>
      <div className="space-y-4">
        {alerts.slice(0, 6).map((alert, index) => (
          <div key={`${alert.tool}-${alert.employee}-${index}`} className="flex gap-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-400 shadow-danger" />
            <div>
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs text-slate-500">{formatDate(alert.timestamp)} via {alert.channel}</p>
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-sm text-slate-400">No high-risk alerts generated yet.</p>}
      </div>
    </Card>
  );
}
