"use client";

import axios from "axios";
import { Upload, Database } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { useData } from "./data-provider";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle } from "./ui/card";

export function UploadPanel() {
  const { refresh, loadDemo } = useData();
  const onDrop = async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      await axios.post("/api/upload", form);
      await refresh();
      toast.success("Upload analyzed");
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.error ?? "Upload failed" : "Upload failed");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "text/csv": [".csv"], "application/json": [".json"] }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>SaaS Detection Engine</CardTitle>
      </CardHeader>
      <div
        {...getRootProps()}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-400/40 bg-cyan-400/5 p-6 text-center transition hover:bg-cyan-400/10"
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 text-cyan-300" />
        <p className="font-semibold">{isDragActive ? "Drop file to analyze" : "Upload CSV or JSON"}</p>
        <p className="mt-1 text-sm text-slate-400">employee_email, tool_name, domain, oauth_permissions, department, signup_date</p>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={loadDemo}>
        <Database size={16} /> Load Demo Incident
      </Button>
    </Card>
  );
}
