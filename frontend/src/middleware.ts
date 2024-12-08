import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const protectedRoutes = ["/home"];
  const { pathname } = req.nextUrl;

  if (protectedRoutes.includes(pathname)) {
    const token = req.cookies.get("Authentication");

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Specify the matcher to apply the middleware to specific routes
export const config = {
  matcher: ["/home"],
};
