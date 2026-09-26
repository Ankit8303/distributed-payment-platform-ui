import React from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Account — Distributed Payment Platform",
  description: "Register for a Customer or Merchant account on the distributed payment platform",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between p-6">
      {/* Background radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
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

      <main className="relative z-10 flex-grow flex items-center justify-center py-12">
        <RegisterForm />
      </main>

      <footer className="relative z-10 text-center py-4 text-xs text-slate-600">
        <p>Distributed Payment Platform UI &bull; Phase F1 Registration</p>
      </footer>
    </div>
  );
}
