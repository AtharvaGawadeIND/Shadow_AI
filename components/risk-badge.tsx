import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
        level === "LOW" && "risk-low",
        level === "MEDIUM" && "risk-medium",
        level === "HIGH" && "risk-high"
      )}
    >
      {level}
    </span>
  );
}
