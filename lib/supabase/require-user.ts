import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireApiUser(): Promise<NextResponse | null> {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return null;
    return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
  } catch {
    return NextResponse.json({ error: "Authentication unavailable" }, { status: 503, headers });
  }
}
