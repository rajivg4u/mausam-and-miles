
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL("/login?verified=1", origin)
      );
    }
  } else if (
    tokenHash &&
    (type === "signup" ||
      type === "email" ||
      type === "recovery" ||
      type === "invite" ||
      type === "magiclink" ||
      type === "email_change")
  ) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(
          new URL("/reset-password", origin)
        );
      }

      return NextResponse.redirect(
        new URL("/login?verified=1", origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?verification=failed", origin)
  );
}
