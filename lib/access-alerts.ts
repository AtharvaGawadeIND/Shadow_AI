import type { AccessEvent, Alert } from "@/types";

export function alertsForBlockedEvent(event: AccessEvent): Alert[] {
  const message = `Blocked unauthorized SaaS access to ${event.domain}`;
  return (["in-app", "email", "slack"] as const).map((channel): Alert => ({
    message,
    severity: "HIGH",
    tool: event.domain,
    employee: event.employeeEmail,
    timestamp: event.timestamp,
    channel
  }));
}
