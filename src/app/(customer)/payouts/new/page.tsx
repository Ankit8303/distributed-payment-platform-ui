"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PayoutForm } from "@/features/payouts/components/payout-form";

function PayoutNewContent() {
  const searchParams = useSearchParams();
  const defaultAccountId = searchParams.get("accountId") ?? "";
  const defaultCurrency = searchParams.get("currency") ?? "USD";

  return (
    <PayoutForm
      defaultAccountId={defaultAccountId}
      defaultCurrency={defaultCurrency}
    />
  );
}

export default function NewPayoutPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header section with Single h1 */}
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
          Create Outbound Payout
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Disburse ledger funds to your connected external payout destination.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600 dark:text-emerald-400" />
          </div>
        }
      >
        <PayoutNewContent />
      </Suspense>
    </div>
  );
}
