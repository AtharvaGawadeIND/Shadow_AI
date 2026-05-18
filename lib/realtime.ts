import { EventEmitter } from "events";

export const realtimeBus = new EventEmitter();

export type RealtimeEvent =
  | "NEW_DETECTION"
  | "NEW_ALERT"
  | "APP_APPROVED"
  | "APP_BLOCKED"
  | "ACCESS_REQUEST"
  | "ACCESS_APPROVED"
  | "STATS_UPDATED";

declare global {
  // eslint-disable-next-line no-var
  var shadowIo: { emit: (event: string, payload: unknown) => void } | undefined;
}

export function emitRealtime(event: RealtimeEvent, payload: unknown = {}) {
  realtimeBus.emit(event, payload);
  global.shadowIo?.emit(event, payload);
}
