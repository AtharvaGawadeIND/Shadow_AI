"use client";

import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AccessEvent, Alert, Employee, SaaSApp } from "@/types";
import { toast } from "sonner";

type DataContextType = {
  apps: SaaSApp[];
  employees: Employee[];
  alerts: Alert[];
  events: AccessEvent[];
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
  const [loading, setLoading] = useState(true);

  const syncLiveData = useCallback(async () => {
    const [appsRes, employeesRes, alertsRes, eventsRes] = await Promise.all([
      axios.get("/api/apps"),
      axios.get("/api/employees"),
      axios.get("/api/alerts"),
      axios.get("/api/events")
    ]);
    setApps(appsRes.data.apps);
    setEmployees(employeesRes.data.employees);
    setAlerts(alertsRes.data.alerts);
    setEvents(eventsRes.data.events);
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
    toast.success("Demo incident loaded");
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      syncLiveData().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(id);
  }, [syncLiveData]);

  const value = useMemo(
    () => ({ apps, employees, alerts, events, loading, refresh, loadDemo }),
    [apps, employees, alerts, events, loading, refresh, loadDemo]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
