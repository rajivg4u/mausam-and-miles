import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url,key,{
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(items) {
        items.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        items.forEach(({name,value,options}) => response.cookies.set(name,value,options));
      }
    }
  });
  const {data:{user}} = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const publicPath = pathname === '/login' || pathname === '/signup' || pathname === '/verify-otp' || pathname === '/forgot-password' || pathname === '/reset-password';
  if (!user && !publicPath) {
    const redirect = request.nextUrl.clone(); redirect.pathname = '/login';
    redirect.searchParams.set('next', pathname);
    return NextResponse.redirect(redirect);
  }
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/',request.url));
  }
  return response;
}
export const config = { matcher: ['/','/login','/signup','/verify-otp','/forgot-password'] };
