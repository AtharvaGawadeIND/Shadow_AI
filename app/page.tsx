import Link from "next/link";
import { ArrowRight, BrainCircuit, DatabaseZap, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-grid bg-[size:36px_36px]">
      <section className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 py-16">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            Shadow IT detection for modern SaaS sprawl
          </div>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-7xl">
            ShadowShield AI
          </h1>
          <p className="mt-5 max-w-3xl text-xl leading-8 text-slate-300">
            Detecting the SaaS tools your employees use before they become security incidents.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-cyan-300" href="/login">
              Open Admin Console <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="inline-flex h-10 items-center rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              Load Demo Incident
            </Link>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldAlert, title: "Detect", text: "Parse OAuth signups from CSV or JSON and identify unauthorized apps." },
            { icon: BrainCircuit, title: "Assess", text: "Score each SaaS vendor using deterministic risk logic and AI-ready summaries." },
            { icon: DatabaseZap, title: "Respond", text: "Centralize alerts, exposure, affected employees, and approval status." }
          ].map((feature) => (
            <div key={feature.title} className="glass rounded-lg p-5">
              <feature.icon className="mb-4 text-cyan-300" />
              <h2 className="text-lg font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
