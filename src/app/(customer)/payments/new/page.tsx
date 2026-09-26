"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaymentForm } from "@/features/payments/components/payment-form";

export default function NewPaymentPage() {
  return (
    <div className="space-y-6">
      {/* Header section with Single h1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Create Payment
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Submit an idempotency-protected payment to a destination operational account.
          </p>
        </div>
      </div>

      {/* Main Payment Form Container */}
      <div className="pt-2">
        <PaymentForm />
      </div>
    </div>
  );
}
