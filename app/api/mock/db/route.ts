import { NextRequest, NextResponse } from "next/server";
import { isMockAuth } from "@/lib/auth/mode";
import { mockTableQuery } from "@/lib/auth/mock/query";

export async function POST(req: NextRequest) {
  if (!isMockAuth()) {
    return NextResponse.json({ error: "Mock auth disabled" }, { status: 404 });
  }

  const body = await req.json();
  const result = mockTableQuery(String(body.table), body.action, {
    filters: body.filters,
    payload: body.payload,
    single: body.single,
    onConflict: body.onConflict,
  });

  return NextResponse.json(result);
}
