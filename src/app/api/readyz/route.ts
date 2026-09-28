import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { status: "ready", service: "distributed-payment-platform-ui" },
    { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
