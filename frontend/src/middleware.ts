import { NextRequest, NextResponse } from "next/server";

/**
 * Only the library is account-gated. Rooms are deliberately open: a guest with
 * the link must reach /r/{code} and be offered the name prompt.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("Authentication")) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/library"],
};
