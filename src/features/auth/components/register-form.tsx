"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { Eye, EyeOff, Lock, Mail, UserCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(12, "Password must be at least 12 characters long"),
  role: z.enum(["CUSTOMER", "MERCHANT"], {
    errorMap: () => ({ message: "Role must be either CUSTOMER or MERCHANT" }),
  }),
});

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const validation = registerSchema.safeParse({ email, password, role });
    if (!validation.success) {
      const formatted: Record<string, string> = {};
      for (const err of validation.error.issues) {
        if (err.path[0]) {
          formatted[err.path[0].toString()] = err.message;
        }
      }
      setFieldErrors(formatted);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email, password, role });
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === "EMAIL_ALREADY_EXISTS" || err.status === 409) {
          setGeneralError("An account with this email address already exists. Please sign in instead.");
        } else if (err.errorCode === "INVALID_PAYLOAD" || err.status === 400) {
          setGeneralError("Invalid registration data. Please verify your details.");
        } else {
          setGeneralError(err.message || "An unexpected error occurred during registration.");
        }
      } else {
        setGeneralError("Network error. Unable to connect to registration service.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create an account</h1>
        <p className="text-sm text-slate-400">
          Register as a Customer or Merchant to get started
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm"
        >
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {isSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>Account created successfully! Redirecting to sign in...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="register-email" className="block text-xs font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 text-sm focus:outline-none transition-colors ${
                fieldErrors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-800 focus:border-emerald-500"
              }`}
              placeholder="name@company.com"
            />
          </div>
          {fieldErrors.email && (
            <p id="register-email-error" className="mt-1.5 text-xs text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-password" className="block text-xs font-medium text-slate-300 mb-1.5">
            Password (min. 12 characters)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
              className={`w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 text-sm focus:outline-none transition-colors ${
                fieldErrors.password
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-800 focus:border-emerald-500"
              }`}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="register-password-error" className="mt-1.5 text-xs text-red-400">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-role" className="block text-xs font-medium text-slate-300 mb-1.5">
            Account Role
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <UserCheck className="h-4 w-4" />
            </div>
            <select
              id="register-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "CUSTOMER" | "MERCHANT")}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="CUSTOMER">Customer Account</option>
              <option value="MERCHANT">Merchant Account</option>
            </select>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Administrative roles cannot be registered through public signup.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isSuccess}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
