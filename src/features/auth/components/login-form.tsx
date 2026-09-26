"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { getSafeRedirectUrl } from "@/lib/auth/safe-redirect";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectUrl = getSafeRedirectUrl(searchParams?.get("redirect"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const validation = loginSchema.safeParse({ email, password });
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
      await login({ email, password });
      router.push(redirectUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === "INVALID_CREDENTIALS" || err.status === 401) {
          setGeneralError("Invalid email or password. Please verify your credentials.");
        } else if (err.errorCode === "RATE_LIMIT_EXCEEDED" || err.status === 429) {
          setGeneralError("Too many login attempts. Please wait a minute before trying again.");
        } else {
          setGeneralError(err.message || "An unexpected error occurred during login.");
        }
      } else {
        setGeneralError("Network error. Unable to connect to authentication service.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Sign in to your account</h1>
        <p className="text-sm text-slate-400">
          Enter your email and password to access the platform
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

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 text-sm focus:outline-none transition-colors ${
                fieldErrors.email
                  ? "border-red-500 focus:border-red-500"
                  : "border-slate-800 focus:border-emerald-500"
              }`}
              placeholder="name@company.com"
            />
          </div>
          {fieldErrors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
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
            <p id="password-error" className="mt-1.5 text-xs text-red-400">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
