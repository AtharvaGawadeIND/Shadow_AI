"use client";

import axios from "axios";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@shadowshield.ai");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/auth/login", { email, password });
      toast.success("Admin session started");
      router.push("/dashboard");
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.error ?? "Login failed" : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
            <Shield />
          </span>
          <div>
            <h1 className="text-2xl font-black">ShadowShield AI</h1>
            <p className="text-sm text-slate-400">Admin access console</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Email
            <Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Password
            <Input className="mt-2" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          <Button className="w-full" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </Button>
        </form>
        <p className="mt-5 rounded-md bg-slate-900/80 p-3 text-xs text-slate-400">
          Demo credentials: admin@shadowshield.ai / admin123
        </p>
      </Card>
    </main>
  );
}
