import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
