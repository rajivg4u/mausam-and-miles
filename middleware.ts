
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieOptions =
  Parameters<NextResponse["cookies"]["set"]>[2];

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Pages that must work without logging in
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/forgot-password",
    "/reset-password",
    "/verify-otp",
  ];

  const isPublicPath = publicPaths.includes(pathname);
  const isApi = pathname.startsWith("/api/");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isApi) return NextResponse.json({ error: "Authentication unavailable" }, { status: 503 });
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(items: CookieToSet[]) {
        items.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        items.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Public pages remain accessible to everyone.
  // Still refresh Supabase auth cookies.
  if (isPublicPath) {
    await supabase.auth.getUser();
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isApi) {
      const denied = NextResponse.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
      response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
      return denied;
    }
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "next",
      pathname + request.nextUrl.search
    );

    const redirectResponse =
      NextResponse.redirect(redirectUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (isApi) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/verify-otp",
    "/api/:path*",
  ],
};
