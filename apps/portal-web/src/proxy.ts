import { NextRequest, NextResponse } from "next/server";

const PUBLIC_DETAIL = /^\/(news|announcements|knowledge)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * Resolve historical public slugs before the App Router starts streaming.
 * `permanentRedirect()` remains in each page as defense in depth, but a redirect
 * discovered after streaming begins may be represented by a client-side marker
 * with HTTP 200. Crawlers must receive the canonical 308 at the request edge.
 */
export async function proxy(request: NextRequest) {
  const match = PUBLIC_DETAIL.exec(request.nextUrl.pathname);
  const apiBase = process.env.PORTAL_API_INTERNAL_URL;
  if (!match || !apiBase) return NextResponse.next();

  const [, section, slug] = match;
  try {
    const response = await fetch(`${apiBase}/api/v1/${section}/${slug}`, {
      cache: "no-store",
      redirect: "manual",
    });
    if (response.status !== 301 && response.status !== 308) return NextResponse.next();

    const location = response.headers.get("location");
    const expectedPrefix = `/${section}/`;
    if (!location?.startsWith(expectedPrefix) || !PUBLIC_DETAIL.test(location)) {
      return NextResponse.next();
    }

    const destination = request.nextUrl.clone();
    destination.pathname = location;
    destination.search = "";
    return NextResponse.redirect(destination, 308);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/news/:slug", "/announcements/:slug", "/knowledge/:slug"],
};
