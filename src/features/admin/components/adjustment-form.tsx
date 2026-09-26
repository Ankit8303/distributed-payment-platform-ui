"use client";

import React, { useState, useId, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Info,
  Building2,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import { useAdminAccounts } from "@/features/admin/hooks/use-admin-accounts";
import { useAdminAccount } from "@/features/admin/hooks/use-admin-account";
import { AccountAdminStatusBadge } from "@/features/admin/components/account-status-badge";
import { parseDecimalToMinor } from "@/features/payments/utils/money-parser";
import { formatMinorUnits } from "@/lib/formatting/money";
import {
  adjustmentFormSchema,
  UUID_REGEX,
} from "@/features/admin/schemas/adjustment-schema";
import type { FinancialAdjustmentCreateRequest } from "@/types/admin";
import type { AccountAdminResponse } from "@/types/admin";

export interface AdjustmentFormProps {
  initialSourceAccountId?: string;
  initialTargetAccountId?: string;
  onReview?: (payload: FinancialAdjustmentCreateRequest) => void;
  onOpenConfirm?: (payload: FinancialAdjustmentCreateRequest) => void;
  onCancel?: () => void;
  className?: string;
}

export function AdjustmentForm({
  initialSourceAccountId = "",
  initialTargetAccountId = "",
  onReview,
  onOpenConfirm,
  onCancel,
  className = "",
}: AdjustmentFormProps) {
  // Field IDs for accessible label and error association
  const baseId = useId();
  const sourceSelectId = `${baseId}-source-account`;
  const targetSelectId = `${baseId}-target-account`;
  const amountInputId = `${baseId}-amount`;
  const reasonInputId = `${baseId}-reason`;

  // Form field state
  const [sourceAccountId, setSourceAccountId] = useState(initialSourceAccountId);
  const [targetAccountId, setTargetAccountId] = useState(initialTargetAccountId);
  const [amountDecimal, setAmountDecimal] = useState("");
  const [customCurrency, setCustomCurrency] = useState("USD");
  const [reason, setReason] = useState("");

  // Validation & Prepared Payload State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preparedPayload, setPreparedPayload] =
    useState<FinancialAdjustmentCreateRequest | null>(null);

  // Load account directory for easy selection (server-side clamped to 50)
  const {
    data: accountsPage,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useAdminAccounts({ size: 50, sort: "accountNumber,asc" });

  const accountsList: AccountAdminResponse[] = useMemo(
    () => accountsPage?.content || [],
    [accountsPage]
  );

  // Authoritative detail queries for selected source & target
  const isValidSourceUuid = Boolean(sourceAccountId && UUID_REGEX.test(sourceAccountId.trim()));
  const isValidTargetUuid = Boolean(targetAccountId && UUID_REGEX.test(targetAccountId.trim()));

  const { data: sourceAccountDetail, isLoading: isSourceLoading } = useAdminAccount(
    isValidSourceUuid ? sourceAccountId.trim() : undefined
  );
  const { data: targetAccountDetail, isLoading: isTargetLoading } = useAdminAccount(
    isValidTargetUuid ? targetAccountId.trim() : undefined
  );

  // Find in loaded list if already present, or use authoritative query
  const sourceAccount: AccountAdminResponse | undefined = useMemo(() => {
    return (
      accountsList.find((acc) => acc.id === sourceAccountId) || sourceAccountDetail
    );
  }, [accountsList, sourceAccountId, sourceAccountDetail]);

  const targetAccount: AccountAdminResponse | undefined = useMemo(() => {
    return (
      accountsList.find((acc) => acc.id === targetAccountId) || targetAccountDetail
    );
  }, [accountsList, targetAccountId, targetAccountDetail]);

  // Derived effective currency (from verified source account, or target account, or custom)
  const effectiveCurrency = useMemo(() => {
    if (sourceAccount?.currency) return sourceAccount.currency.toUpperCase();
    if (targetAccount?.currency) return targetAccount.currency.toUpperCase();
    return customCurrency.toUpperCase();
  }, [sourceAccount, targetAccount, customCurrency]);

  // Currency mismatch check
  const isCurrencyMismatch = useMemo(() => {
    if (sourceAccount?.currency && targetAccount?.currency) {
      return sourceAccount.currency.toUpperCase() !== targetAccount.currency.toUpperCase();
    }
    return false;
  }, [sourceAccount, targetAccount]);

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Source Account
    const trimmedSource = sourceAccountId.trim();
    if (!trimmedSource) {
      errors.sourceAccountId = "Source account is required";
    } else if (!UUID_REGEX.test(trimmedSource)) {
      errors.sourceAccountId = "Source account ID must be a valid UUID";
    }

    // 2. Target Account
    const trimmedTarget = targetAccountId.trim();
    if (!trimmedTarget) {
      errors.targetAccountId = "Target account is required";
    } else if (!UUID_REGEX.test(trimmedTarget)) {
      errors.targetAccountId = "Target account ID must be a valid UUID";
    } else if (trimmedSource && trimmedTarget && trimmedSource === trimmedTarget) {
      errors.targetAccountId =
        "Source account and target account must not be the same account";
    }

    // 3. Currency Mismatch
    if (isCurrencyMismatch) {
      errors.currency = `Currency mismatch: Source account is in ${sourceAccount?.currency}, but target account is in ${targetAccount?.currency}. Cross-currency adjustments are strictly prohibited.`;
    }

    // 4. Amount parsing (zero floating-point math)
    const parseResult = parseDecimalToMinor(amountDecimal);
    if (parseResult.error) {
      errors.amountDecimal = parseResult.error;
    } else if (parseResult.minor < 1) {
      errors.amountDecimal = "Amount must be at least 1 minor unit (>= 0.01)";
    }

    // 5. Reason validation
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      errors.reason = "Audit reason is required and cannot be blank";
    } else if (trimmedReason.length > 500) {
      errors.reason = "Audit reason cannot exceed 500 characters";
    }

    // Comprehensive Zod schema validation pass
    const zodValidation = adjustmentFormSchema.safeParse({
      sourceAccountId: trimmedSource,
      targetAccountId: trimmedTarget,
      amountDecimal: amountDecimal.trim(),
      currency: effectiveCurrency,
      reason: trimmedReason,
    });

    if (!zodValidation.success) {
      zodValidation.error.errors.forEach((err) => {
        const fieldName = err.path[0] as string;
        if (!errors[fieldName]) {
          errors[fieldName] = err.message;
        }
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: User clicks "Continue to Review"
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const parseResult = parseDecimalToMinor(amountDecimal);

    // Freeze exact payload for review / confirmation in Phase F7-H-C
    const payload: FinancialAdjustmentCreateRequest = {
      sourceAccountId: sourceAccountId.trim(),
      targetAccountId: targetAccountId.trim(),
      amountMinor: parseResult.minor,
      currency: effectiveCurrency,
      reason: reason.trim(),
    };

    setPreparedPayload(payload);
    onReview?.(payload);
  };

  // Reset form
  const handleReset = () => {
    setSourceAccountId(initialSourceAccountId);
    setTargetAccountId(initialTargetAccountId);
    setAmountDecimal("");
    setCustomCurrency("USD");
    setReason("");
    setFieldErrors({});
    setPreparedPayload(null);
    onCancel?.();
  };

  return (
    <div className={`space-y-6 max-w-4xl ${className}`}>
      {/* 1. Administrative Purpose & Safety Notice */}
      <section
        aria-labelledby="adjustment-warning-heading"
        className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 sm:p-5 text-amber-200"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs sm:text-sm">
            <h2
              id="adjustment-warning-heading"
              className="font-semibold text-amber-300 tracking-wide"
            >
              Administrative Financial Adjustment Workspace (Phase F7-H-B)
            </h2>
            <p className="text-amber-200/90 leading-relaxed">
              This form prepares an exact, balanced financial adjustment between two
              system accounts. In the next step (Phase F7-H-C), the prepared payload
              will require explicit confirmation before submitting a synchronous double-entry
              ledger mutation to the backend.
            </p>
            <p className="text-amber-400/90 font-medium">
              Note: No mutation is executed and no idempotency key is generated in this phase.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Prepared Payload Review Banner (If validated and prepared) */}
      {preparedPayload && (
        <section
          data-testid="prepared-payload-card"
          aria-labelledby="prepared-payload-heading"
          className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 p-5 space-y-4"
        >
          <div className="flex items-center gap-2.5 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2
              id="prepared-payload-heading"
              className="text-sm font-semibold tracking-wide text-emerald-200"
            >
              Prepared Adjustment Payload (Ready for Review)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-900/80 rounded-lg p-4 border border-zinc-800">
            <div>
              <span className="text-zinc-400 font-mono text-[11px] block">Source Account ID:</span>
              <span className="font-mono text-zinc-100 break-all">{preparedPayload.sourceAccountId}</span>
            </div>
            <div>
              <span className="text-zinc-400 font-mono text-[11px] block">Target Account ID:</span>
              <span className="font-mono text-zinc-100 break-all">{preparedPayload.targetAccountId}</span>
            </div>
            <div>
              <span className="text-zinc-400 font-mono text-[11px] block">Amount (Minor Units):</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {preparedPayload.amountMinor} ({preparedPayload.currency})
              </span>
            </div>
            <div>
              <span className="text-zinc-400 font-mono text-[11px] block">Formatted Amount:</span>
              <span className="font-semibold text-zinc-200">
                {formatMinorUnits(preparedPayload.amountMinor, preparedPayload.currency)}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-zinc-400 font-mono text-[11px] block">Audit Reason:</span>
              <span className="text-zinc-200 italic break-words">{preparedPayload.reason}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-emerald-900/60">
            <span className="text-[11px] text-zinc-400">
              Payload frozen. Ready for explicit confirmation in Phase F7-H-C.
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPreparedPayload(null)}
                className="text-xs text-zinc-300 hover:text-white underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-2 py-1"
              >
                Edit Form Values
              </button>
              {onOpenConfirm && (
                <button
                  type="button"
                  data-testid="open-confirmation-dialog-button"
                  onClick={() => onOpenConfirm(preparedPayload)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span>Review & Confirm</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Main Financial Adjustment Form */}
      <form
        id="adjustment-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Financial Adjustment Form"
        className="space-y-6 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-7 shadow-xs"
      >
        {/* ================================================================= */}
        {/* SOURCE ACCOUNT SECTION */}
        {/* ================================================================= */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Source Account (Debit Leg)</span>
            <span className="text-rose-400" aria-hidden="true">*</span>
          </legend>

          <p className="text-xs text-zinc-400">
            Select the source account from which funds will be deducted.
          </p>

          <div className="space-y-2">
            <label htmlFor={sourceSelectId} className="sr-only">
              Source Account Selection
            </label>
            <select
              id={sourceSelectId}
              name="sourceAccountId"
              value={sourceAccountId}
              onChange={(e) => {
                setSourceAccountId(e.target.value);
                if (fieldErrors.sourceAccountId) {
                  setFieldErrors((prev) => ({ ...prev, sourceAccountId: "" }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.sourceAccountId)}
              aria-describedby={
                fieldErrors.sourceAccountId ? `${sourceSelectId}-error` : undefined
              }
              className={`w-full rounded-lg bg-zinc-950 border px-3 py-2.5 text-xs sm:text-sm text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                fieldErrors.sourceAccountId
                  ? "border-rose-600 focus-visible:ring-rose-500"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <option value="">
                {isAccountsLoading
                  ? "-- Loading accounts directory... --"
                  : "-- Select Source Account --"}
              </option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} ({acc.accountType}) — {acc.currency} [{acc.status}]
                </option>
              ))}
            </select>

            {isAccountsError && (
              <p className="text-[11px] text-amber-400">
                Notice: Accounts directory failed to load. You can enter an account UUID directly.
              </p>
            )}

            {isSourceLoading && (
              <p className="text-[11px] text-zinc-400 animate-pulse">
                Fetching source account details...
              </p>
            )}

            {/* Direct UUID Input fallback for unlisted accounts */}
            <div className="flex items-center gap-2 pt-1">
              <label htmlFor={`${sourceSelectId}-raw`} className="text-[11px] text-zinc-400 font-mono">
                Or enter UUID directly:
              </label>
              <input
                id={`${sourceSelectId}-raw`}
                type="text"
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  if (fieldErrors.sourceAccountId) {
                    setFieldErrors((prev) => ({ ...prev, sourceAccountId: "" }));
                  }
                }}
                placeholder="e.g. 11111111-1111-4111-8111-111111111111"
                className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            </div>

            {fieldErrors.sourceAccountId && (
              <p
                id={`${sourceSelectId}-error`}
                role="alert"
                className="text-xs text-rose-400 font-medium"
              >
                {fieldErrors.sourceAccountId}
              </p>
            )}
          </div>

          {/* Selected Source Account Context Card */}
          {sourceAccount && (
            <div
              data-testid="source-account-card"
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <span className="font-semibold text-zinc-200 font-mono">
                  {sourceAccount.accountNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    {sourceAccount.accountType}
                  </span>
                  <AccountAdminStatusBadge status={sourceAccount.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Account ID:</span>
                  <span className="font-mono text-[11px] text-zinc-400 break-all">
                    {sourceAccount.id}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Currency:</span>
                  <span className="font-semibold text-zinc-200">{sourceAccount.currency}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Materialized Balance:</span>
                  <span className="font-semibold text-zinc-200">
                    {formatMinorUnits(sourceAccount.materializedBalanceMinor, sourceAccount.currency)}
                  </span>
                </div>
              </div>

              {/* FROZEN / CLOSED Account Warning */}
              {sourceAccount.status === "FROZEN" && (
                <div
                  data-testid="source-frozen-warning"
                  role="status"
                  className="flex items-center gap-2 p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>
                    Warning: Source account is FROZEN. Review the account status carefully before continuing.
                  </span>
                </div>
              )}
              {sourceAccount.status === "CLOSED" && (
                <div
                  data-testid="source-closed-warning"
                  role="status"
                  className="flex items-center gap-2 p-2 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    Warning: Source account is CLOSED. Review the account status carefully before continuing.
                  </span>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {/* ================================================================= */}
        {/* TARGET ACCOUNT SECTION */}
        {/* ================================================================= */}
        <fieldset className="space-y-3 pt-2 border-t border-zinc-800/80">
          <legend className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <span>Target Account (Credit Leg)</span>
            <span className="text-rose-400" aria-hidden="true">*</span>
          </legend>

          <p className="text-xs text-zinc-400">
            Select the target account to which funds will be credited.
          </p>

          <div className="space-y-2">
            <label htmlFor={targetSelectId} className="sr-only">
              Target Account Selection
            </label>
            <select
              id={targetSelectId}
              name="targetAccountId"
              value={targetAccountId}
              onChange={(e) => {
                setTargetAccountId(e.target.value);
                if (fieldErrors.targetAccountId) {
                  setFieldErrors((prev) => ({ ...prev, targetAccountId: "" }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.targetAccountId)}
              aria-describedby={
                fieldErrors.targetAccountId ? `${targetSelectId}-error` : undefined
              }
              className={`w-full rounded-lg bg-zinc-950 border px-3 py-2.5 text-xs sm:text-sm text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fieldErrors.targetAccountId
                  ? "border-rose-600 focus-visible:ring-rose-500"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <option value="">
                {isAccountsLoading
                  ? "-- Loading accounts directory... --"
                  : "-- Select Target Account --"}
              </option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} ({acc.accountType}) — {acc.currency} [{acc.status}]
                </option>
              ))}
            </select>

            {isTargetLoading && (
              <p className="text-[11px] text-zinc-400 animate-pulse">
                Fetching target account details...
              </p>
            )}

            {/* Direct UUID Input fallback for unlisted accounts */}
            <div className="flex items-center gap-2 pt-1">
              <label htmlFor={`${targetSelectId}-raw`} className="text-[11px] text-zinc-400 font-mono">
                Or enter UUID directly:
              </label>
              <input
                id={`${targetSelectId}-raw`}
                type="text"
                value={targetAccountId}
                onChange={(e) => {
                  setTargetAccountId(e.target.value);
                  if (fieldErrors.targetAccountId) {
                    setFieldErrors((prev) => ({ ...prev, targetAccountId: "" }));
                  }
                }}
                placeholder="e.g. 22222222-2222-4222-8222-222222222222"
                className="flex-1 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>

            {fieldErrors.targetAccountId && (
              <p
                id={`${targetSelectId}-error`}
                role="alert"
                className="text-xs text-rose-400 font-medium"
              >
                {fieldErrors.targetAccountId}
              </p>
            )}
          </div>

          {/* Selected Target Account Context Card */}
          {targetAccount && (
            <div
              data-testid="target-account-card"
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                <span className="font-semibold text-zinc-200 font-mono">
                  {targetAccount.accountNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    {targetAccount.accountType}
                  </span>
                  <AccountAdminStatusBadge status={targetAccount.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Account ID:</span>
                  <span className="font-mono text-[11px] text-zinc-400 break-all">
                    {targetAccount.id}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Currency:</span>
                  <span className="font-semibold text-zinc-200">{targetAccount.currency}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Materialized Balance:</span>
                  <span className="font-semibold text-zinc-200">
                    {formatMinorUnits(targetAccount.materializedBalanceMinor, targetAccount.currency)}
                  </span>
                </div>
              </div>

              {/* FROZEN / CLOSED Account Warning */}
              {targetAccount.status === "FROZEN" && (
                <div
                  data-testid="target-frozen-warning"
                  role="status"
                  className="flex items-center gap-2 p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>
                    Warning: Target account is FROZEN. Review the account status carefully before continuing.
                  </span>
                </div>
              )}
              {targetAccount.status === "CLOSED" && (
                <div
                  data-testid="target-closed-warning"
                  role="status"
                  className="flex items-center gap-2 p-2 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 text-[11px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    Warning: Target account is CLOSED. Review the account status carefully before continuing.
                  </span>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {/* ================================================================= */}
        {/* CURRENCY & AMOUNT SECTION */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
          {/* Currency Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-200">
              Adjustment Currency
            </label>
            <div className="flex items-center gap-2">
              <span
                data-testid="effective-currency-badge"
                className="inline-flex items-center px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm font-mono font-bold text-zinc-100"
              >
                {effectiveCurrency}
              </span>
              <span className="text-[11px] text-zinc-400">
                {sourceAccount?.currency
                  ? "(Derived from source account)"
                  : "(Verified ISO currency)"}
              </span>
            </div>

            {fieldErrors.currency && (
              <p role="alert" className="text-xs text-rose-400 font-medium pt-1">
                {fieldErrors.currency}
              </p>
            )}
          </div>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <label htmlFor={amountInputId} className="block text-xs font-semibold text-zinc-200">
              Amount ({effectiveCurrency}) <span className="text-rose-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-400 pointer-events-none">
                {effectiveCurrency}
              </span>
              <input
                id={amountInputId}
                name="amountDecimal"
                type="text"
                inputMode="decimal"
                value={amountDecimal}
                onChange={(e) => {
                  setAmountDecimal(e.target.value);
                  if (fieldErrors.amountDecimal) {
                    setFieldErrors((prev) => ({ ...prev, amountDecimal: "" }));
                  }
                }}
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.amountDecimal)}
                aria-describedby={
                  fieldErrors.amountDecimal ? `${amountInputId}-error` : `${amountInputId}-hint`
                }
                className={`w-full rounded-lg bg-zinc-950 border pl-14 pr-3 py-2 text-xs sm:text-sm text-zinc-100 font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  fieldErrors.amountDecimal
                    ? "border-rose-600 focus-visible:ring-rose-500"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              />
            </div>

            {fieldErrors.amountDecimal ? (
              <p
                id={`${amountInputId}-error`}
                role="alert"
                className="text-xs text-rose-400 font-medium"
              >
                {fieldErrors.amountDecimal}
              </p>
            ) : (
              <p id={`${amountInputId}-hint`} className="text-[11px] text-zinc-500">
                Use decimal format (e.g. 150.00). Transported to backend as integer minor units.
              </p>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* REASON SECTION */}
        {/* ================================================================= */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <label htmlFor={reasonInputId} className="block text-xs font-semibold text-zinc-200">
              Audit Reason <span className="text-rose-400" aria-hidden="true">*</span>
            </label>
            <span
              aria-live="polite"
              className={`text-[11px] font-mono ${
                reason.trim().length > 500 ? "text-rose-400 font-bold" : "text-zinc-500"
              }`}
            >
              {reason.trim().length}/500 chars
            </span>
          </div>

          <textarea
            id={reasonInputId}
            name="reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (fieldErrors.reason) {
                setFieldErrors((prev) => ({ ...prev, reason: "" }));
              }
            }}
            placeholder="Enter mandatory audit justification for this administrative adjustment (max 500 chars)..."
            aria-invalid={Boolean(fieldErrors.reason)}
            aria-describedby={fieldErrors.reason ? `${reasonInputId}-error` : undefined}
            className={`w-full rounded-lg bg-zinc-950 border px-3 py-2 text-xs sm:text-sm text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 resize-none ${
              fieldErrors.reason
                ? "border-rose-600 focus-visible:ring-rose-500"
                : "border-zinc-700 hover:border-zinc-600"
            }`}
          />

          {fieldErrors.reason && (
            <p
              id={`${reasonInputId}-error`}
              role="alert"
              className="text-xs text-rose-400 font-medium"
            >
              {fieldErrors.reason}
            </p>
          )}
        </div>

        {/* ================================================================= */}
        {/* ACTIONS */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
            <span>Step 1 of 2: Prepare & Validate Payload</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span>Continue to Review</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
