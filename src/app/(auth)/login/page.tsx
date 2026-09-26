import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In — Distributed Payment Platform",
  description: "Secure authentication into the distributed payment and ledger platform",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to platform overview</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>Stateless JWT Security</span>
        </div>
      </header>

      <main id="main-content" className="relative z-10 flex-grow flex items-center justify-center py-12">
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-slate-400">Loading sign in...</div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      <footer className="relative z-10 text-center py-4 text-xs text-slate-600">
        <p>Distributed Payment Platform UI &bull; Phase F1 Authentication</p>
      </footer>
    </div>
  );
}
