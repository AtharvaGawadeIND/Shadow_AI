import * as React from "react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 rounded-md border border-slate-700 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-cyan-400",
        props.className
      )}
    />
  );
}
