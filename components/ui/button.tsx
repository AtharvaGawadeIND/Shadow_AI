import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-cyan-400 text-slate-950 shadow-glow hover:bg-cyan-300",
        variant === "secondary" && "border border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800",
        variant === "ghost" && "text-slate-300 hover:bg-slate-800/80 hover:text-white",
        variant === "danger" && "bg-rose-500 text-white shadow-danger hover:bg-rose-400",
        className
      )}
      {...props}
    />
  );
}
