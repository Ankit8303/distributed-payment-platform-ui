"use client";

import React from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { UserStatusBadge, UserRoleBadge } from "./user-status-badge";
import type { UserAdminResponse } from "@/types/admin";
import { formatDateTime } from "@/lib/formatting/date";

export interface UserTableProps {
  users: UserAdminResponse[];
  isLoading: boolean;
}

export function UserTable({ users, isLoading }: UserTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="user-table-skeleton"
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
      >
        <div className="h-5 w-48 bg-zinc-800/60 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-zinc-800/30 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        data-testid="user-table-empty"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 text-zinc-500">
          <Users className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">
          No users found
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
          No platform user accounts match the current query parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-zinc-300"
          aria-label="User Directory"
          data-testid="user-directory-table"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">User ID</th>
              <th scope="col" className="px-4 py-3">Email Address</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {users.map((u) => {
              const formattedDate = formatDateTime(u.createdAt, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <tr
                  key={u.id}
                  data-testid={`user-row-${u.id}`}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  {/* User ID */}
                  <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                    <span className="sr-only">{u.id}</span>
                    <span aria-hidden="true" title={u.id}>
                      {u.id.slice(0, 8)}...
                    </span>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {u.email}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <UserRoleBadge role={u.role} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <UserStatusBadge status={u.status} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Action Link */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      data-testid={`view-user-${u.id}-link`}
                      aria-label={`Inspect user ${u.email}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
