"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import type { UserRole } from "@/types/auth";
import { Loader2, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.push(redirectUrl);
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "idle") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[50vh] flex flex-col items-center justify-center space-y-4"
      >
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Verifying session authority...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  let isUnauthorized = false;
  if (allowedRoles && allowedRoles.length > 0) {
    isUnauthorized = !user?.role || !allowedRoles.includes(user.role);
  } else if (requiredRole) {
    isUnauthorized = user?.role !== requiredRole && user?.role !== "ADMIN";
  }

  if (isUnauthorized) {
    return (
      <div
        role="alert"
        data-testid="access-restricted-alert"
        className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200"
      >
        <div className="flex items-center gap-3 mb-2 font-semibold text-lg text-amber-300">
          <ShieldAlert className="h-6 w-6 text-amber-400" />
          <span>Access Restricted</span>
        </div>
        <p className="text-sm text-slate-300">
          Your account role (<code className="font-mono text-xs text-amber-300">{user?.role}</code>) lacks permission to access this view. Backend authorization remains authoritative.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
