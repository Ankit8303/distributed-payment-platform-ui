import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  Database,
  KeyRound,
  FileCheck
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Navigation Bar Header */}
        <header className="flex flex-wrap items-center justify-between pb-8 mb-12 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-xl flex items-center justify-center">
                <Cpu className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-white">PaymentLedger</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                UI Foundation
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Phase F1 Active
            </span>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-colors font-semibold shadow-sm"
            >
              Register
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center md:text-left space-y-6 max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-xs font-mono text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Backend Authority: Frozen Spring Boot Core
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Distributed Payment & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Double-Entry Ledger UI
            </span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl leading-relaxed">
            Enterprise frontend engineered for high-concurrency financial operations. Built upon contract-first integration with immutable audit guarantees.
          </p>
        </section>

        {/* System Boundary & Architecture Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16" aria-label="Architecture Highlights">
          <article className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 transition-all shadow-xl group">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <Database className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Authoritative Backend</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The browser is never a financial authority. Balances, idempotency locks, settlements, and ledger entries are strictly confirmed by Spring Boot.
            </p>
          </article>

          <article className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 transition-all shadow-xl group">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Contract-First Integration</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Full alignment with RFC 7807 problem details, standardized minor unit monetary formatting, and mandatory <code className="text-cyan-300 font-mono text-xs">X-Correlation-ID</code> tracing.
            </p>
          </article>

          <article className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 transition-all shadow-xl group">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Defense-in-Depth Security</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Zero browser secrets, strict CSP headers, Zod-validated client environments, and non-retryable financial mutation semantics.
            </p>
          </article>
        </section>

        {/* Phase F0 Readiness Checklist */}
        <section className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                Phase F0 Foundation Verification Status
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Architecture, tooling, and quality gates validated for phase freeze.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider">
              Ready for Freeze
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Stack Configuration</p>
                <p className="text-sm font-semibold text-slate-200">Next.js 15 & React 19</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Type Safety</p>
                <p className="text-sm font-semibold text-slate-200">TypeScript Strict Mode</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Test Frameworks</p>
                <p className="text-sm font-semibold text-slate-200">Vitest & Playwright</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Security Gate</p>
                <p className="text-sm font-semibold text-slate-200">Zero Leaked Secrets</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              <span>Phase F1 Boundary: Authentication, Sessions & Protected Routes will be implemented next.</span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-slate-500 font-mono">
              <span>docs/phases/PHASE-F1.md</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>Distributed Payment Platform UI &bull; Phase F0 Bootstrap &bull; Frozen Backend Authority</p>
      </footer>
    </main>
  );
}
