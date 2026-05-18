"use client";

import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type { AccessEvent, AccessRequest, Alert, Employee, SaaSApp } from "@/types";
import { toast } from "sonner";

type DataContextType = {
  apps: SaaSApp[];
  employees: Employee[];
  alerts: Alert[];
  events: AccessEvent[];
  accessRequests: AccessRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
  loadDemo: () => Promise<void>;
};

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [apps, setApps] = useState<SaaSApp[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const syncLiveData = useCallback(async () => {
    const [appsRes, employeesRes, alertsRes, eventsRes, accessRes] = await Promise.all([
      axios.get("/api/apps"),
      axios.get("/api/employees"),
      axios.get("/api/alerts"),
      axios.get("/api/events"),
      axios.get("/api/access")
    ]);
    setApps(appsRes.data.apps);
    setEmployees(employeesRes.data.employees);
    setAlerts(alertsRes.data.alerts);
    setEvents(eventsRes.data.events);
    setAccessRequests(accessRes.data.accessRequests);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await syncLiveData();
    } finally {
      setLoading(false);
    }
  }, [syncLiveData]);

  const loadDemo = useCallback(async () => {
    const res = await axios.post("/api/demo/load");
    setApps(res.data.apps);
    setEmployees(res.data.employees);
    setAlerts(res.data.alerts);
    setEvents([]);
    setAccessRequests([]);
    toast.success("Demo incident loaded");
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    const refreshEvents = ["NEW_DETECTION", "NEW_ALERT", "APP_APPROVED", "APP_BLOCKED", "ACCESS_REQUEST", "ACCESS_APPROVED", "POLICY_UPDATED", "STATS_UPDATED"];
    refreshEvents.forEach((event) => socket.on(event, () => syncLiveData().catch(() => undefined)));
    const id = window.setInterval(() => syncLiveData().catch(() => undefined), 10000);
    return () => {
      refreshEvents.forEach((event) => socket.off(event));
      socket.disconnect();
      window.clearInterval(id);
    };
  }, [syncLiveData]);

  const value = useMemo(
    () => ({ apps, employees, alerts, events, accessRequests, loading, refresh, loadDemo }),
    [apps, employees, alerts, events, accessRequests, loading, refresh, loadDemo]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
