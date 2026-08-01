import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockAuth } from "@/lib/auth/mode";
import { listMockEmailsFor } from "@/lib/auth/mock/store";

/** List stub contract emails for the current user (mock auth only). */
export async function GET() {
  if (!isMockAuth()) {
    return NextResponse.json({ error: "Mock only" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const emails = listMockEmailsFor(user.email);
  return NextResponse.json({ emails });
}
